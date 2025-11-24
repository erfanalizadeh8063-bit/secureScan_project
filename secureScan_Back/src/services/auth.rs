use crate::db::DbPool;
use crate::domain::users_repo;

use argon2::Argon2;
use password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use rand_core::OsRng;
use sqlx;
use thiserror::Error;
use uuid::Uuid;

/// سرویس ارورهای مربوط به احراز هویت
#[derive(Debug, Error)]
pub enum AuthError {
    #[error("email already in use")]
    EmailTaken,

    #[error("invalid email or password")]
    InvalidCredentials,

    #[error("database error: {0}")]
    Db(#[from] sqlx::Error),

    #[error("password hash error: {0}")]
    Hash(#[from] password_hash::Error),
}

/// تولید هش امن برای پسورد با Argon2
pub fn hash_password(password: &str) -> Result<String, AuthError> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    let password_hash = argon2.hash_password(password.as_bytes(), &salt)?;
    Ok(password_hash.to_string())
}

/// چک کردن پسورد کاربر با هش ذخیره‌شده
pub fn verify_password(stored_hash: &str, password: &str) -> Result<(), AuthError> {
    let parsed_hash = PasswordHash::new(stored_hash)?;
    let argon2 = Argon2::default();

    // هر اروری از verify رو به InvalidCredentials مپ می‌کنیم
    argon2
        .verify_password(password.as_bytes(), &parsed_hash)
        .map_err(|_| AuthError::InvalidCredentials)
}

/// ثبت‌نام کاربر جدید:
/// - اگر ایمیل وجود داشته باشد => AuthError::EmailTaken
/// - در غیر این صورت، هش پسورد ساخته و در DB ذخیره می‌شود
pub async fn register_user(
    pool: &DbPool,
    email: &str,
    password: &str,
) -> Result<Uuid, AuthError> {
    // آیا ایمیل قبلاً ثبت شده؟
    if let Some(_) = users_repo::find_by_email(pool, email).await? {
        return Err(AuthError::EmailTaken);
    }

    let password_hash = hash_password(password)?;
    let user_id = users_repo::insert_user(pool, email, &password_hash).await?;
    Ok(user_id)
}

/// لاگین کاربر:
/// - اگر ایمیل پیدا نشد یا پسورد اشتباه بود => AuthError::InvalidCredentials
/// - در غیر این صورت، id کاربر برگردانده می‌شود
pub async fn login_user(
    pool: &DbPool,
    email: &str,
    password: &str,
) -> Result<Uuid, AuthError> {
    let user = users_repo::find_by_email(pool, email).await?;

    let Some(user) = user else {
        return Err(AuthError::InvalidCredentials);
    };

    verify_password(&user.password_hash, password)?;
    Ok(user.id)
}
