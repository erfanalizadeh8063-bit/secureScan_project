use crate::jobs::queue::{ScanJob, ScanQueue};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use url::Url;
use uuid::Uuid;

#[allow(dead_code)]
#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "lowercase")]
pub enum ScanStatus {
    Queued,
    Running,
    Completed,
    Failed,
    Canceled,
}

#[allow(dead_code)]
#[derive(Clone, Serialize, Deserialize, Debug, Default)]
pub struct Finding {
    pub r#type: String,
    pub severity: String,
    pub title: String,
    pub description: String,
    pub location: String,
}

#[allow(dead_code)]
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct ScanRecord {
    pub id: Uuid,
    pub target_url: String,
    pub status: ScanStatus,
    pub findings: Vec<Finding>,
    pub created_at: DateTime<Utc>,
    pub finished_at: Option<DateTime<Utc>>,
}

#[allow(dead_code)]
#[derive(Clone)]
pub struct ScanService {
    state: Arc<RwLock<HashMap<Uuid, ScanRecord>>>,
    queue: ScanQueue,
}

#[allow(dead_code)]
impl ScanService {
    pub fn new(queue: ScanQueue) -> Self {
        Self {
            state: Arc::new(RwLock::new(HashMap::new())),
            queue,
        }
    }

    /// Enqueue a new scan and initialize an in-memory record.
    pub fn enqueue(&self, target: Url) -> anyhow::Result<Uuid> {
        let id = Uuid::new_v4();

        let rec = ScanRecord {
            id,
            target_url: target.to_string(),
            status: ScanStatus::Queued,
            findings: vec![],
            created_at: Utc::now(),
            finished_at: None,
        };

        self.state.write().unwrap().insert(id, rec);

        // IMPORTANT: use `send` (not `push`)
        self.queue.send(ScanJob { id, target })?;

        Ok(id)
    }

    /// Get a scan record by id.
    pub fn get(&self, id: Uuid) -> Option<ScanRecord> {
        self.state.read().unwrap().get(&id).cloned()
    }

    /// Update status for a scan record.
    pub fn set_status(&self, id: Uuid, status: ScanStatus) {
        if let Some(r) = self.state.write().unwrap().get_mut(&id) {
            r.status = status.clone();
            if matches!(status, ScanStatus::Completed | ScanStatus::Failed | ScanStatus::Canceled) {
                r.finished_at = Some(Utc::now());
            }
        }
    }

    /// Replace findings for a scan record.
    pub fn set_findings(&self, id: Uuid, findings: Vec<Finding>) {
        if let Some(r) = self.state.write().unwrap().get_mut(&id) {
            r.findings = findings;
        }
    }

    pub fn list(&self) -> Vec<ScanRecord> {
        let mut v: Vec<_> = self.state.read().unwrap().values().cloned().collect();
        v.sort_by(|a, b| b.created_at.cmp(&a.created_at)); // newest first
        v
    }
}
