use serde::{Deserialize, Serialize};
use sysinfo::{CpuRefreshKind, MemoryRefreshKind, RefreshKind, System};
use std::collections::VecDeque;
use std::time::Duration;
use tokio::time;

#[derive(Serialize, Deserialize, Debug)]
struct SystemMetrics {
    timestamp: u64,
    cpu_usage_percent: f32,
    cpu_cores: Vec<CoreMetrics>,
    memory_total_mb: u64,
    memory_used_mb: u64,
    memory_free_mb: u64,
    memory_available_mb: u64,
    memory_usage_percent: f32,
    cpu_spike_detected: bool,
    memory_leak_suspected: bool,
    swap_total_mb: u64,
    swap_used_mb: u64,
}

#[derive(Serialize, Deserialize, Debug)]
struct CoreMetrics {
    core_id: usize,
    usage_percent: f32,
}

struct Monitor {
    sys: System,
    cpu_history: VecDeque<f32>,
    memory_history: VecDeque<u64>,
    baseline_samples: usize,
    spike_threshold_multiplier: f32,
    memory_leak_threshold: f32,
}

impl Monitor {
    fn new() -> Self {
        let sys = System::new_with_specifics(
            RefreshKind::nothing()
                .with_cpu(CpuRefreshKind::everything())
                .with_memory(MemoryRefreshKind::everything()),
        );

        Self {
            sys,
            cpu_history: VecDeque::with_capacity(30),
            memory_history: VecDeque::with_capacity(30),
            baseline_samples: 10,
            spike_threshold_multiplier: 2.0,
            memory_leak_threshold: 1.2, // 20% growth over baseline
        }
    }

    fn refresh(&mut self) {
        self.sys.refresh_cpu_all();
        self.sys.refresh_memory();
    }

    fn detect_cpu_spike(&self, current_cpu: f32) -> bool {
        if self.cpu_history.len() < self.baseline_samples {
            return false;
        }

        let avg: f32 = self.cpu_history.iter().sum::<f32>() / self.cpu_history.len() as f32;
        let threshold = avg * self.spike_threshold_multiplier;

        current_cpu > threshold && avg > 5.0 // Only detect spikes if baseline is above 5%
    }

    fn detect_memory_leak(&self, current_memory: u64) -> bool {
        if self.memory_history.len() < self.baseline_samples {
            return false;
        }

        let avg: u64 = self.memory_history.iter().sum::<u64>() / self.memory_history.len() as u64;
        let threshold = (avg as f32 * self.memory_leak_threshold) as u64;

        current_memory > threshold && current_memory > avg
    }

    fn collect_metrics(&mut self) -> SystemMetrics {
        self.refresh();

        let global_cpu = self.sys.global_cpu_usage();

        let cpu_cores: Vec<CoreMetrics> = self.sys
            .cpus()
            .iter()
            .enumerate()
            .map(|(id, cpu)| CoreMetrics {
                core_id: id,
                usage_percent: cpu.cpu_usage(),
            })
            .collect();

        let memory_total = self.sys.total_memory() / 1_048_576; // Convert to MB
        let memory_used = self.sys.used_memory() / 1_048_576;
        let memory_free = self.sys.free_memory() / 1_048_576;
        let memory_available = self.sys.available_memory() / 1_048_576;
        let memory_usage_percent = (memory_used as f32 / memory_total as f32) * 100.0;

        let swap_total = self.sys.total_swap() / 1_048_576;
        let swap_used = self.sys.used_swap() / 1_048_576;

        let cpu_spike = self.detect_cpu_spike(global_cpu);
        let memory_leak = self.detect_memory_leak(memory_used);

        // Update histories
        self.cpu_history.push_back(global_cpu);
        if self.cpu_history.len() > 30 {
            self.cpu_history.pop_front();
        }

        self.memory_history.push_back(memory_used);
        if self.memory_history.len() > 30 {
            self.memory_history.pop_front();
        }

        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        SystemMetrics {
            timestamp,
            cpu_usage_percent: global_cpu,
            cpu_cores,
            memory_total_mb: memory_total,
            memory_used_mb: memory_used,
            memory_free_mb: memory_free,
            memory_available_mb: memory_available,
            memory_usage_percent,
            cpu_spike_detected: cpu_spike,
            memory_leak_suspected: memory_leak,
            swap_total_mb: swap_total,
            swap_used_mb: swap_used,
        }
    }
}

#[tokio::main]
async fn main() {
    let mut monitor = Monitor::new();

    // Initial refresh to populate CPU data
    monitor.refresh();
    tokio::time::sleep(Duration::from_millis(500)).await;

    let mut interval = time::interval(Duration::from_secs(1));

    loop {
        interval.tick().await;

        let metrics = monitor.collect_metrics();

        match serde_json::to_string(&metrics) {
            Ok(json) => println!("{}", json),
            Err(e) => eprintln!("Error serializing metrics: {}", e),
        }
    }
}
