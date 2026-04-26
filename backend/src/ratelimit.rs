use dashmap::DashMap;
use governor::clock::DefaultClock;
use governor::state::{InMemoryState, NotKeyed};
use governor::{Quota, RateLimiter};
use nonzero_ext::nonzero;
use std::sync::Arc;

type DirectLimiter = RateLimiter<NotKeyed, InMemoryState, DefaultClock>;

#[derive(Clone)]
pub struct RateLimiters {
    inner: Arc<Inner>,
}

struct Inner {
    per_ip_write: DashMap<String, Arc<DirectLimiter>>,
    per_session_write: DashMap<String, Arc<DirectLimiter>>,
    per_ip_read: DashMap<String, Arc<DirectLimiter>>,
}

impl RateLimiters {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Inner {
                per_ip_write: DashMap::new(),
                per_session_write: DashMap::new(),
                per_ip_read: DashMap::new(),
            }),
        }
    }

    fn limiter(map: &DashMap<String, Arc<DirectLimiter>>, key: &str, quota: Quota) -> Arc<DirectLimiter> {
        if let Some(l) = map.get(key) {
            return l.clone();
        }
        let l = Arc::new(RateLimiter::direct(quota));
        map.insert(key.to_string(), l.clone());
        l
    }

    pub fn check_write_ip(&self, ip: &str) -> bool {
        let q = Quota::per_minute(nonzero!(20u32)).allow_burst(nonzero!(5u32));
        let l = Self::limiter(&self.inner.per_ip_write, ip, q);
        l.check().is_ok()
    }

    pub fn check_write_session(&self, session: &str) -> bool {
        let q = Quota::per_minute(nonzero!(15u32)).allow_burst(nonzero!(3u32));
        let l = Self::limiter(&self.inner.per_session_write, session, q);
        l.check().is_ok()
    }

    pub fn check_read_ip(&self, ip: &str) -> bool {
        let q = Quota::per_second(nonzero!(10u32)).allow_burst(nonzero!(20u32));
        let l = Self::limiter(&self.inner.per_ip_read, ip, q);
        l.check().is_ok()
    }
}
