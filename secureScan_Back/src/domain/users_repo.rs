use crate::db::DbPool;
use crate::domain::user::User;
use sqlx;
use uuid::Uuid;

/// Find user by email, return Option<User>
pub async fn find_by_email(
    pool: &DbPool,
    email: &str,
) -> Result<Option<User>, sqlx::Error> {
    let user = sqlx::query_as::<_, User>(
        r#"
        SELECT id, email, password_hash, created_at
        FROM users
        WHERE email = $1
        "#,
    )
    .bind(email)
    .fetch_optional(pool)
    .await?;

    Ok(user)
}

/// Insert new user and return its id
pub async fn insert_user(
    pool: &DbPool,
    email: &str,
    password_hash: &str,
) -> Result<Uuid, sqlx::Error> {
    let user = sqlx::query_as::<_, User>(
        r#"
        INSERT INTO users (email, password_hash)
        VALUES ($1, $2)
        RETURNING id, email, password_hash, created_at
        "#,
    )
    .bind(email)
    .bind(password_hash)
    .fetch_one(pool)
    .await?;

    Ok(user.id)
}
