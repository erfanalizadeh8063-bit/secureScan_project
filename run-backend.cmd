@echo off
cd secureScan_Back
set RUST_LOG=info,actix_web=info
cargo run
