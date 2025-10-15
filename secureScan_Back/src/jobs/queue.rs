use std::sync::Arc;
use tokio::sync::{mpsc, Semaphore};
use uuid::Uuid;
use url::Url;

use crate::domain::scan_service::{ScanService, ScanStatus, Finding as ApiFinding};
use crate::scanner;

/// Represents a single scan job.
#[derive(Clone, Debug)]
pub struct ScanJob {
    pub id: Uuid,
    pub target: Url,
}

/// Thin wrapper around an mpsc sender to enqueue jobs.
#[derive(Clone)]
pub struct ScanQueue {
    tx: mpsc::Sender<ScanJob>,
}

impl ScanQueue {
    pub fn new(tx: mpsc::Sender<ScanJob>) -> Self {
        Self { tx }
    }
    pub fn send(&self, job: ScanJob) -> anyhow::Result<()> {
        self.tx
            .try_send(job)
            .map_err(|e| anyhow::anyhow!(e.to_string()))
    }
}

/// Starts worker dispatcher that receives jobs and processes them concurrently.
/// This function spawns its own background task and returns immediately.
pub fn start_workers(service: ScanService, mut rx: mpsc::Receiver<ScanJob>, concurrency: usize) {
    let service = Arc::new(service);
    let sem = Arc::new(Semaphore::new(concurrency));

    // Dispatcher loop in background
    tokio::spawn(async move {
        while let Some(job) = rx.recv().await {
            let permit = sem.clone().acquire_owned().await.unwrap();
            let service_cloned = service.clone();

            tokio::spawn(async move {
                // 1) mark as running
                service_cloned.set_status(job.id, ScanStatus::Running);

                // 2) call real scanner
                let result = scanner::scan_target(job.target.as_str()).await;

                match result {
                    Ok(res) => {
                        // Map scanner findings (strings) into API Finding objects
                        // We use "info/low" severity for this MVP; you can adjust later.
                        let mapped: Vec<ApiFinding> = res
                            .security_findings
                            .into_iter()
                            .map(|text| ApiFinding {
                                r#type: "check".to_string(),
                                severity: "info".to_string(),
                                title: text.clone(),
                                description: text,
                                location: res.url.clone(),
                            })
                            .collect();

                        service_cloned.set_findings(job.id, mapped);
                        service_cloned.set_status(job.id, ScanStatus::Completed);
                        tracing::info!("Worker: completed scan {}", job.id);
                    }
                    Err(err) => {
                        service_cloned.set_findings(
                            job.id,
                            vec![ApiFinding {
                                r#type: "error".into(),
                                severity: "high".into(),
                                title: "Scanner failed".into(),
                                description: err.to_string(),
                                location: job.target.to_string(),
                            }],
                        );
                        service_cloned.set_status(job.id, ScanStatus::Failed);
                        tracing::error!("Worker: scan {} failed: {}", job.id, err);
                    }
                }

                drop(permit);
            });
        }
    });
}
