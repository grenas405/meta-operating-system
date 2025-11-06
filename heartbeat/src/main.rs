use serde::{Deserialize, Serialize};
use sysinfo::{Disks, Networks, ProcessesToUpdate, System};
use std::collections::VecDeque;
use std::time::Duration;
use tokio::time;

#[derive(Serialize, Deserialize, Debug)]
struct SystemMetrics {
    timestamp: u64,

    // OS Information
    os_info: OsInfo,

    // CPU Metrics
    cpu_usage_percent: f32,
    cpu_cores: Vec<CoreMetrics>,
    cpu_info: CpuInfo,

    // Memory Metrics
    memory_total_mb: u64,
    memory_used_mb: u64,
    memory_free_mb: u64,
    memory_available_mb: u64,
    memory_usage_percent: f32,
    swap_total_mb: u64,
    swap_used_mb: u64,

    // Disk Metrics
    disks: Vec<DiskMetrics>,

    // Network Metrics
    network_interfaces: Vec<NetworkMetrics>,

    // Process Metrics
    process_count: usize,
    top_processes: Vec<ProcessMetrics>,

    // System Load & Uptime
    load_average: LoadAverage,
    uptime_seconds: u64,
    boot_time: u64,

    // Anomaly Detection
    cpu_spike_detected: bool,
    memory_leak_suspected: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct OsInfo {
    name: String,
    kernel_version: String,
    os_version: String,
    long_os_version: String,
    hostname: String,
    distribution_id: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct CoreMetrics {
    core_id: usize,
    usage_percent: f32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct CpuInfo {
    brand: String,
    vendor_id: String,
    frequency_mhz: u64,
    physical_core_count: usize,
}

#[derive(Serialize, Deserialize, Debug)]
struct DiskMetrics {
    name: String,
    mount_point: String,
    total_space_gb: f64,
    available_space_gb: f64,
    used_space_gb: f64,
    usage_percent: f32,
    is_removable: bool,
    disk_kind: String,
    file_system: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct NetworkMetrics {
    interface_name: String,
    bytes_received: u64,
    bytes_transmitted: u64,
    packets_received: u64,
    packets_transmitted: u64,
    errors_received: u64,
    errors_transmitted: u64,
}

#[derive(Serialize, Deserialize, Debug)]
struct ProcessMetrics {
    pid: u32,
    name: String,
    cpu_usage: f32,
    memory_mb: u64,
    disk_read_bytes: u64,
    disk_write_bytes: u64,
}

#[derive(Serialize, Deserialize, Debug)]
struct LoadAverage {
    one_minute: f64,
    five_minutes: f64,
    fifteen_minutes: f64,
}

struct Monitor {
    sys: System,
    networks: Networks,
    disks: Disks,
    cpu_history: VecDeque<f32>,
    memory_history: VecDeque<u64>,
    baseline_samples: usize,
    spike_threshold_multiplier: f32,
    memory_leak_threshold: f32,
    // Static system information (collected once)
    os_info: OsInfo,
    cpu_info: CpuInfo,
}

impl Monitor {
    fn new() -> Self {
        let mut sys = System::new_all();

        // Initial refresh to get data
        sys.refresh_all();

        let networks = Networks::new_with_refreshed_list();
        let disks = Disks::new_with_refreshed_list();

        // Collect static OS information
        let os_info = OsInfo {
            name: System::name().unwrap_or_else(|| "Unknown".to_string()),
            kernel_version: System::kernel_version().unwrap_or_else(|| "Unknown".to_string()),
            os_version: System::os_version().unwrap_or_else(|| "Unknown".to_string()),
            long_os_version: System::long_os_version().unwrap_or_else(|| "Unknown".to_string()),
            hostname: System::host_name().unwrap_or_else(|| "Unknown".to_string()),
            distribution_id: System::distribution_id(),
        };

        // Collect static CPU information (from first CPU, they're all the same)
        let cpu_info = if let Some(cpu) = sys.cpus().first() {
            CpuInfo {
                brand: cpu.brand().to_string(),
                vendor_id: cpu.vendor_id().to_string(),
                frequency_mhz: cpu.frequency(),
                physical_core_count: sys.physical_core_count().unwrap_or(0),
            }
        } else {
            CpuInfo {
                brand: "Unknown".to_string(),
                vendor_id: "Unknown".to_string(),
                frequency_mhz: 0,
                physical_core_count: 0,
            }
        };

        Self {
            sys,
            networks,
            disks,
            cpu_history: VecDeque::with_capacity(30),
            memory_history: VecDeque::with_capacity(30),
            baseline_samples: 10,
            spike_threshold_multiplier: 2.0,
            memory_leak_threshold: 1.2, // 20% growth over baseline
            os_info,
            cpu_info,
        }
    }

    fn refresh(&mut self) {
        self.sys.refresh_cpu_all();
        self.sys.refresh_memory();
        self.sys.refresh_processes(ProcessesToUpdate::All, true);
        self.networks.refresh(true);
        self.disks.refresh(true);
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

        // CPU Metrics
        let cpu_cores: Vec<CoreMetrics> = self.sys
            .cpus()
            .iter()
            .enumerate()
            .map(|(id, cpu)| CoreMetrics {
                core_id: id,
                usage_percent: cpu.cpu_usage(),
            })
            .collect();

        // Memory Metrics
        let memory_total = self.sys.total_memory() / 1_048_576; // Convert to MB
        let memory_used = self.sys.used_memory() / 1_048_576;
        let memory_free = self.sys.free_memory() / 1_048_576;
        let memory_available = self.sys.available_memory() / 1_048_576;
        let memory_usage_percent = (memory_used as f32 / memory_total as f32) * 100.0;

        let swap_total = self.sys.total_swap() / 1_048_576;
        let swap_used = self.sys.used_swap() / 1_048_576;

        // Disk Metrics
        let disks: Vec<DiskMetrics> = self.disks
            .iter()
            .map(|disk| {
                let total_space = disk.total_space() as f64 / 1_073_741_824.0; // Convert to GB
                let available_space = disk.available_space() as f64 / 1_073_741_824.0;
                let used_space = total_space - available_space;
                let usage_percent = if total_space > 0.0 {
                    (used_space / total_space * 100.0) as f32
                } else {
                    0.0
                };

                DiskMetrics {
                    name: disk.name().to_string_lossy().to_string(),
                    mount_point: disk.mount_point().to_string_lossy().to_string(),
                    total_space_gb: total_space,
                    available_space_gb: available_space,
                    used_space_gb: used_space,
                    usage_percent,
                    is_removable: disk.is_removable(),
                    disk_kind: format!("{:?}", disk.kind()),
                    file_system: disk.file_system().to_string_lossy().to_string(),
                }
            })
            .collect();

        // Network Metrics
        let network_interfaces: Vec<NetworkMetrics> = self.networks
            .iter()
            .map(|(interface_name, data)| NetworkMetrics {
                interface_name: interface_name.clone(),
                bytes_received: data.total_received(),
                bytes_transmitted: data.total_transmitted(),
                packets_received: data.total_packets_received(),
                packets_transmitted: data.total_packets_transmitted(),
                errors_received: data.total_errors_on_received(),
                errors_transmitted: data.total_errors_on_transmitted(),
            })
            .collect();

        // Process Metrics
        let mut processes: Vec<_> = self.sys.processes().values().collect();
        processes.sort_by(|a, b| b.cpu_usage().partial_cmp(&a.cpu_usage()).unwrap_or(std::cmp::Ordering::Equal));

        let top_processes: Vec<ProcessMetrics> = processes
            .iter()
            .take(10) // Top 10 processes by CPU
            .map(|process| ProcessMetrics {
                pid: process.pid().as_u32(),
                name: process.name().to_string_lossy().to_string(),
                cpu_usage: process.cpu_usage(),
                memory_mb: process.memory() / 1_048_576,
                disk_read_bytes: process.disk_usage().read_bytes,
                disk_write_bytes: process.disk_usage().written_bytes,
            })
            .collect();

        let process_count = self.sys.processes().len();

        // Load Average and Uptime
        let load_avg = System::load_average();
        let load_average = LoadAverage {
            one_minute: load_avg.one,
            five_minutes: load_avg.five,
            fifteen_minutes: load_avg.fifteen,
        };

        let uptime_seconds = System::uptime();
        let boot_time = System::boot_time();

        // Anomaly Detection
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
            os_info: self.os_info.clone(),
            cpu_usage_percent: global_cpu,
            cpu_cores,
            cpu_info: self.cpu_info.clone(),
            memory_total_mb: memory_total,
            memory_used_mb: memory_used,
            memory_free_mb: memory_free,
            memory_available_mb: memory_available,
            memory_usage_percent,
            swap_total_mb: swap_total,
            swap_used_mb: swap_used,
            disks,
            network_interfaces,
            process_count,
            top_processes,
            load_average,
            uptime_seconds,
            boot_time,
            cpu_spike_detected: cpu_spike,
            memory_leak_suspected: memory_leak,
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
