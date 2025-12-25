use chrono::{DateTime, Utc};
use uuid::Uuid;

/// Core user model used across the backend
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub created_at: DateTime<Utc>,
}
