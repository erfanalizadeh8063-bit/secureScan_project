use crate::db::DbPool;
use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, FromRow)]
pub struct UserRow {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub created_at: DateTime<Utc>,
}

/// پیدا کردن کاربر بر اساس ایمیل (برای لاگین و چک‌کردن تکراری بودن ایمیل)
pub async fn find_user_by_email(
    pool: &DbPool,
    email: &str,
) -> Result<Option<UserRow>, sqlx::Error> {
    let row = sqlx::query_as::<_, UserRow>(
        r#"
        SELECT id, email, password_hash, created_at
        FROM users
        WHERE lower(email) = lower($1)
        "#,
    )
    .bind(email)
    .fetch_optional(pool)
    .await?;

    Ok(row)
}

/// ساخت کاربر جدید (برای register)
pub async fn create_user(
    pool: &DbPool,
    email: &str,
    password_hash: &str,
) -> Result<UserRow, sqlx::Error> {
    // UUID را در خود Rust تولید می‌کنیم، نه با تابع دیتابیس
    let new_id = Uuid::new_v4();

    let row = sqlx::query_as::<_, UserRow>(
        r#"
        INSERT INTO users (id, email, password_hash, created_at)
        VALUES ($1, $2, $3, now())
        RETURNING id, email, password_hash, created_at
        "#,
    )
    .bind(new_id)
    .bind(email)
    .bind(password_hash)
    .fetch_one(pool)
    .await?;

    Ok(row)
}

/// پیدا کردن کاربر بر اساس id (بعداً به درد پروفایل/توکن می‌خوره)
pub async fn get_user_by_id(
    pool: &DbPool,
    id: Uuid,
) -> Result<Option<UserRow>, sqlx::Error> {
    let row = sqlx::query_as::<_, UserRow>(
        r#"
        SELECT id, email, password_hash, created_at
        FROM users
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(row)
}
