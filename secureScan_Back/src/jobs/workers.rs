use std::sync::Arc;
use tokio::sync::{mpsc, Semaphore};
use tokio::time::{sleep, Duration};

use crate::jobs::queue::ScanJob;

/// Start a background dispatcher that receives jobs and processes them
/// concurrently by spawning worker tasks limited by `concurrency`.
///
/// This function spawns a single dispatcher task and returns immediately.
pub fn start_workers(mut rx: mpsc::Receiver<ScanJob>, concurrency: usize) {
    let sem = Arc::new(Semaphore::new(concurrency));

    tokio::spawn(async move {
        while let Some(job) = rx.recv().await {
            let permit = sem.clone().acquire_owned().await.unwrap();

            tokio::spawn(async move {
                tracing::info!(target = "workers", "Scanning {}", job.target);
                // simulate processing time
                sleep(Duration::from_secs(2)).await;
                tracing::info!(target = "workers", "Done {}", job.target);
                drop(permit);
            });
        }

        tracing::warn!(target = "workers", "Dispatcher: job channel closed, exiting");
    });
}
