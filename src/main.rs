#![feature(proc_macro_hygiene, decl_macro)]

mod board;

use rocket::{get, routes};

#[get("/")]
fn hello() -> &'static str {
    "Hello, Commboard!"
}

fn main() {
    rocket::ignite().mount("/", routes![hello]).launch();
}
