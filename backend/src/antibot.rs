use cookie::time::{Duration as CookieDuration, OffsetDateTime};
use cookie::{Cookie, SameSite};
use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256};

pub const SESSION_COOKIE: &str = "foodr_sid";
pub const CSRF_COOKIE: &str = "foodr_csrf";
pub const POW_DIFFICULTY: u32 = 16; // bits of leading zeros required

type HmacSha256 = Hmac<Sha256>;

pub fn new_session_id() -> String {
    uuid::Uuid::new_v4().simple().to_string()
}

pub fn new_csrf_token() -> String {
    use rand::RngCore;
    let mut buf = [0u8; 24];
    rand::thread_rng().fill_bytes(&mut buf);
    hex::encode(buf)
}

pub fn new_pow_seed() -> String {
    use rand::RngCore;
    let mut buf = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut buf);
    hex::encode(buf)
}

pub fn sign_session(key: &[u8], session_id: &str) -> String {
    let mut mac = HmacSha256::new_from_slice(key).expect("hmac key");
    mac.update(session_id.as_bytes());
    hex::encode(mac.finalize().into_bytes())
}

/// Returns Set-Cookie header values for the session + CSRF cookies.
pub fn build_session_cookies(session_id: &str, signature: &str, csrf: &str) -> Vec<String> {
    let value = format!("{}.{}", session_id, signature);
    let max_age = CookieDuration::days(180);

    let mut sid_cookie = Cookie::new(SESSION_COOKIE, value);
    sid_cookie.set_path("/");
    sid_cookie.set_http_only(true);
    sid_cookie.set_same_site(SameSite::Lax);
    sid_cookie.set_max_age(max_age);
    sid_cookie.set_expires(OffsetDateTime::now_utc() + max_age);
    // Secure is added by reverse proxy in production; leaving off for local dev.

    let mut csrf_cookie = Cookie::new(CSRF_COOKIE, csrf.to_string());
    csrf_cookie.set_path("/");
    csrf_cookie.set_http_only(false); // readable by JS for double-submit
    csrf_cookie.set_same_site(SameSite::Lax);
    csrf_cookie.set_max_age(max_age);
    csrf_cookie.set_expires(OffsetDateTime::now_utc() + max_age);

    vec![sid_cookie.to_string(), csrf_cookie.to_string()]
}

pub fn parse_session_cookie(header_value: &str, key: &[u8]) -> Option<String> {
    for raw in header_value.split(';') {
        let raw = raw.trim();
        let Some((name, value)) = raw.split_once('=') else { continue };
        if name != SESSION_COOKIE {
            continue;
        }
        let (sid, sig) = value.split_once('.')?;
        let expected = sign_session(key, sid);
        if constant_time_eq(expected.as_bytes(), sig.as_bytes()) {
            return Some(sid.to_string());
        }
    }
    None
}

pub fn parse_csrf_cookie(header_value: &str) -> Option<String> {
    for raw in header_value.split(';') {
        let raw = raw.trim();
        let Some((name, value)) = raw.split_once('=') else { continue };
        if name == CSRF_COOKIE {
            return Some(value.to_string());
        }
    }
    None
}

fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

/// Verify proof-of-work: SHA256(seed || ":" || nonce) has at least `difficulty` leading zero bits.
pub fn verify_pow(seed: &str, nonce: &str, difficulty: u32) -> bool {
    if nonce.len() > 64 {
        return false;
    }
    let mut hasher = Sha256::new();
    hasher.update(seed.as_bytes());
    hasher.update(b":");
    hasher.update(nonce.as_bytes());
    let digest = hasher.finalize();
    leading_zero_bits(&digest) >= difficulty
}

fn leading_zero_bits(bytes: &[u8]) -> u32 {
    let mut count = 0u32;
    for b in bytes {
        if *b == 0 {
            count += 8;
        } else {
            count += b.leading_zeros();
            break;
        }
    }
    count
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pow_roundtrip() {
        // Find a nonce ourselves and verify.
        let seed = "deadbeef";
        let difficulty = 8;
        let mut n = 0u64;
        loop {
            let nonce = n.to_string();
            if verify_pow(seed, &nonce, difficulty) {
                break;
            }
            n += 1;
            if n > 1_000_000 {
                panic!("difficulty too high for test");
            }
        }
    }

    #[test]
    fn signed_session_roundtrips() {
        let key = [7u8; 32];
        let sid = "abc123";
        let sig = sign_session(&key, sid);
        let header = format!("foodr_sid={}.{}; other=x", sid, sig);
        assert_eq!(parse_session_cookie(&header, &key), Some(sid.to_string()));
        let bad = format!("foodr_sid={}.{}", sid, "deadbeef");
        assert_eq!(parse_session_cookie(&bad, &key), None);
    }
}
