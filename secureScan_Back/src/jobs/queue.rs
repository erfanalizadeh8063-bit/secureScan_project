use std::sync::Arc;
use tokio::sync::{mpsc, Semaphore};
use uuid::Uuid;
use url::Url;

use crate::db::DbPool;
use crate::domain::scans_repo;
use crate::scanner;
use chrono::Utc;
use serde_json::Value as JsonValue;

/// Represents a single scan job.
#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct ScanJob {
    pub id: Uuid,
    pub target: Url,
}

/// Thin wrapper around an mpsc sender to enqueue jobs.
#[allow(dead_code)]
#[derive(Clone)]
pub struct ScanQueue {
    tx: mpsc::Sender<ScanJob>,
}

#[allow(dead_code)]
impl ScanQueue {
    pub fn new(tx: mpsc::Sender<ScanJob>) -> Self {
        Self { tx }
    }

    /// Try to enqueue without awaiting (fast-path). Returns error if full.
    pub fn send(&self, job: ScanJob) -> anyhow::Result<()> {
        self.tx
            .try_send(job)
            .map_err(|e| anyhow::anyhow!(e.to_string()))
    }

    /// Enqueue asynchronously, awaiting if the channel is full.
    pub async fn enqueue(&self, job: ScanJob) -> anyhow::Result<()> {
        self.tx
            .send(job)
            .await
            .map_err(|e| anyhow::anyhow!(e.to_string()))
    }
}

/// Starts worker dispatcher that receives jobs and processes them concurrently.
/// Workers update scan status and insert scan_results into the DB.
#[allow(dead_code)]
pub fn start_workers_db(pool: DbPool, mut rx: mpsc::Receiver<ScanJob>, concurrency: usize) {
    let sem = Arc::new(Semaphore::new(concurrency));

    // Dispatcher loop in background
    tokio::spawn(async move {
        while let Some(job) = rx.recv().await {
            let permit = sem.clone().acquire_owned().await.unwrap();
            let pool_cloned = pool.clone();

            tokio::spawn(async move {
                tracing::info!("Worker: starting scan {} -> {}", job.id, job.target);

                // 1) mark as running in DB
                if let Err(e) = scans_repo::update_scan_status(&pool_cloned, job.id, "running").await {
                    tracing::error!("Failed to set running status for {}: {}", job.id, e);
                }

                // 2) call real scanner
                match scanner::scan_target(job.target.as_str()).await {
                    Ok(res) => {
                        // Convert headers map to JSON
                        let headers_json: Option<JsonValue> = match serde_json::to_value(&res.headers) {
                            Ok(v) => Some(v),
                            Err(e) => {
                                tracing::error!("Failed to serialize headers for {}: {}", job.id, e);
                                None
                            }
                        };

                        // Convert findings (Vec<String>) to JSON value
                        let issues_json: JsonValue = match serde_json::to_value(&res.security_findings) {
                            Ok(v) => v,
                            Err(e) => {
                                tracing::error!("Failed to serialize findings for {}: {}", job.id, e);
                                serde_json::json!([])
                            }
                        };

                        let completed_at = Utc::now();

                        // Insert scan result into DB
                        match scans_repo::insert_scan_result(
                            &pool_cloned,
                            job.id,
                            headers_json,
                            None,
                            issues_json,
                            completed_at,
                        )
                        .await
                        {
                            Ok(_) => {
                                // update status to completed
                                if let Err(e) = scans_repo::update_scan_status(&pool_cloned, job.id, "completed").await {
                                    tracing::error!("Failed to set completed status for {}: {}", job.id, e);
                                }
                                tracing::info!("Worker: completed scan {}", job.id);
                            }
                            Err(e) => {
                                tracing::error!("Failed to insert scan result for {}: {}", job.id, e);
                                let _ = scans_repo::update_scan_status(&pool_cloned, job.id, "failed").await;
                            }
                        }
                    }
                    Err(err) => {
                        tracing::error!("Worker: scan {} failed: {}", job.id, err);
                        let _ = scans_repo::update_scan_status(&pool_cloned, job.id, "failed").await;
                    }
                }

                drop(permit);
            });
        }
    });
}
