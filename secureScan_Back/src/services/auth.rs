use crate::db::DbPool;
use crate::domain::users_repo;

use argon2::Argon2;
use password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use rand_core::OsRng;
use sqlx;
use thiserror::Error;
use uuid::Uuid;

/// Errors that can happen during authentication
#[derive(Debug, Error)]
pub enum AuthError {
    /// Email is already registered
    #[error("email already in use")]
    EmailTaken,

    /// Email or password is invalid
    #[error("invalid email or password")]
    InvalidCredentials,

    /// Wrapped database error
    #[error("database error: {0}")]
    Db(#[from] sqlx::Error),

    /// Password hashing/parsing error
    #[error("password hash error")]
    Hash,
}

/// Hash a plain text password using Argon2
pub fn hash_password(password: &str) -> Result<String, AuthError> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|_| AuthError::Hash)?;

    Ok(password_hash.to_string())
}

/// Verify a plain text password against a stored hash
pub fn verify_password(stored_hash: &str, password: &str) -> Result<(), AuthError> {
    let parsed_hash = PasswordHash::new(stored_hash).map_err(|_| AuthError::Hash)?;
    let argon2 = Argon2::default();

    argon2
        .verify_password(password.as_bytes(), &parsed_hash)
        .map_err(|_| AuthError::InvalidCredentials)
}

/// Register a new user with email + password
pub async fn register_user(
    pool: &DbPool,
    email: &str,
    password: &str,
) -> Result<Uuid, AuthError> {
    // Check if email already exists
    if let Some(_) = users_repo::find_by_email(pool, email).await? {
        return Err(AuthError::EmailTaken);
    }

    // Hash password and insert into DB
    let password_hash = hash_password(password)?;
    let user_id = users_repo::insert_user(pool, email, &password_hash).await?;
    Ok(user_id)
}

/// Login a user and return their id if credentials are valid
pub async fn login_user(
    pool: &DbPool,
    email: &str,
    password: &str,
) -> Result<Uuid, AuthError> {
    // Find user by email
    let user = users_repo::find_by_email(pool, email).await?;

    let Some(user) = user else {
        return Err(AuthError::InvalidCredentials);
    };

    // Verify password against stored hash
    verify_password(&user.password_hash, password)?;
    Ok(user.id)
}
