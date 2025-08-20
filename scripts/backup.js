#!/usr/bin/env node

// scripts/backup.js - Sistema de Backup Avançado
const fs = require('fs').promises;
const path = require('path');
const { createReadStream, createWriteStream } = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');
const { createGzip } = require('zlib');

const pipelineAsync = promisify(pipeline);

class BackupManager {
  constructor() {
    this.projectRoot = path.dirname(__dirname);
    this.backupDir = path.join(this.projectRoot, 'data', 'backups');
    this.exportDir = path.join(this.projectRoot, 'data', 'exports');
    this.logsDir = path.join(this.projectRoot, 'logs');
    
    this.config = {
      retention_days: 30,
      max_backups: 50,
      compression: true,
      include_logs: false
    };
  }

  async performBackup(options = {}) {
    console.log('💾 CryptoTrader MCP - Backup System');
    console.log('=' * 40);
    
    try {
      const backupOptions = { ...this.config, ...options };
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupId = `backup_${timestamp}`;
      
      console.log(`🆔 Backup ID: ${backupId}`);
      console.log(`📅 Timestamp: ${new Date().toLocaleString()}`);
      console.log('');
      
      // Criar diretórios necessários
      await this.ensureDirectories();
      
      // Backup dos dados principais
      const dataBackup = await this.backupDataFiles(backupId);
      
      // Backup da configuração
      const configBackup = await this.backupConfiguration(backupId);
      
      // Backup de logs (opcional)
      let logsBackup = null;
      if (backupOptions.include_logs) {
        logsBackup = await this.backupLogs(backupId);
      }
      
      // Criar arquivo de metadados
      const metadata = await this.createBackupMetadata(backupId, {
        data: dataBackup,
        config: configBackup,
        logs: logsBackup,
        options: backupOptions
      });
      
      // Comprimir backup se solicitado
      let finalBackup = null;
      if (backupOptions.compression) {
        finalBackup = await this.compressBackup(backupId);
      }
      
      // Limpeza de backups antigos
      await this.cleanupOldBackups(backupOptions.retention_days, backupOptions.max_backups);
      
      // Relatório final
      const report = this.generateBackupReport(backupId, metadata, finalBackup);
      await this.saveBackupReport(report);
      
      console.log('\n✅ BACKUP COMPLETED SUCCESSFULLY');
      console.log(`📦 Backup ID: ${backupId}`);
      console.log(`📊 Files backed up: ${report.files_count}`);
      console.log(`💾 Total size: ${this.formatBytes(report.total_size)}`);
      console.log(`⏱️ Duration: ${report.duration}ms`);
      
      return {
        success: true,
        backup_id: backupId,
        report: report
      };
      
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      
      // Log do erro
      await this.logBackupError(error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  async ensureDirectories() {
    const dirs = [this.backupDir, this.exportDir, this.logsDir];
    
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
    
    console.log('📁 Backup directories ready');
  }

  async backupDataFiles(backupId) {
    console.log('💾 Backing up data files...');
    const dataDir = path.join(this.projectRoot, 'data');
    const backupDataDir = path.join(this.backupDir, backupId, 'data');
    await fs.mkdir(backupDataDir, { recursive: true });
    const files = await fs.readdir(dataDir);
    let copied = [];
    for (const file of files) {
      const src = path.join(dataDir, file);
      const dest = path.join(backupDataDir, file);
      const stat = await fs.stat(src);
      if (stat.isFile()) {
        await fs.copyFile(src, dest);
        copied.push(dest);
      }
    }
    return copied;
  }

  async backupConfiguration(backupId) {
    console.log('🛠️ Backing up configuration...');
    const configFile = path.join(this.projectRoot, 'src', 'utils', 'config.js');
    const backupConfigDir = path.join(this.backupDir, backupId, 'config');
    await fs.mkdir(backupConfigDir, { recursive: true });
    const dest = path.join(backupConfigDir, 'config.js');
    await fs.copyFile(configFile, dest);
    return dest;
  }

  async backupLogs(backupId) {
    console.log('📝 Backing up logs...');
    const backupLogsDir = path.join(this.backupDir, backupId, 'logs');
    await fs.mkdir(backupLogsDir, { recursive: true });
    const files = await fs.readdir(this.logsDir);
    let copied = [];
    for (const file of files) {
      const src = path.join(this.logsDir, file);
      const dest = path.join(backupLogsDir, file);
      const stat = await fs.stat(src);
      if (stat.isFile()) {
        await fs.copyFile(src, dest);
        copied.push(dest);
      }
    }
    return copied;
  }

  async createBackupMetadata(backupId, details) {
    const metaDir = path.join(this.backupDir, backupId);
    const metaFile = path.join(metaDir, 'metadata.json');
    const metadata = {
      backup_id: backupId,
      created_at: new Date().toISOString(),
      ...details
    };
    await fs.writeFile(metaFile, JSON.stringify(metadata, null, 2));
    return metaFile;
  }

  async compressBackup(backupId) {
    console.log('📦 Compressing backup...');
    const backupPath = path.join(this.backupDir, backupId);
    const archivePath = path.join(this.backupDir, `${backupId}.tar.gz`);
    const tar = require('tar');
    await tar.c({ gzip: true, file: archivePath, cwd: this.backupDir }, [backupId]);
    return archivePath;
  }

  async cleanupOldBackups(retentionDays, maxBackups) {
    console.log('🧹 Cleaning up old backups...');
    const files = await fs.readdir(this.backupDir);
    const backupDirs = files.filter(f => f.startsWith('backup_') && !f.endsWith('.tar.gz'));
    // Sort by date (descending)
    backupDirs.sort((a, b) => b.localeCompare(a));
    // Remove backups exceeding maxBackups
    for (let i = maxBackups; i < backupDirs.length; i++) {
      const dirToRemove = path.join(this.backupDir, backupDirs[i]);
      await fs.rm(dirToRemove, { recursive: true, force: true });
    }
    // Remove backups older than retentionDays
    const now = Date.now();
    for (const dir of backupDirs) {
      const dirPath = path.join(this.backupDir, dir);
      const stat = await fs.stat(dirPath);
      const ageDays = (now - stat.mtimeMs) / (1000 * 60 * 60 * 24);
      if (ageDays > retentionDays) {
        await fs.rm(dirPath, { recursive: true, force: true });
      }
    }
  }

  generateBackupReport(backupId, metadataFile, archiveFile) {
    const start = Date.now();
    let files_count = 0;
    let total_size = 0;
    // Count files and size in backup dir
    const backupPath = path.join(this.backupDir, backupId);
    const walk = dir => {
      let count = 0;
      let size = 0;
      const items = require('fs').readdirSync(dir);
      for (const item of items) {
        const full = path.join(dir, item);
        const stat = require('fs').statSync(full);
        if (stat.isFile()) {
          count++;
          size += stat.size;
        } else if (stat.isDirectory()) {
          const { count: c, size: s } = walk(full);
          count += c;
          size += s;
        }
      }
      return { count, size };
    };
    try {
      const { count, size } = walk(backupPath);
      files_count = count;
      total_size = size;
    } catch {}
    const duration = Date.now() - start;
    return {
      backup_id: backupId,
      files_count,
      total_size,
      duration,
      metadata_file: metadataFile,
      archive_file: archiveFile
    };
  }

  async saveBackupReport(report) {
    const reportFile = path.join(this.backupDir, `${report.backup_id}_report.json`);
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    return reportFile;
  }

  async logBackupError(error) {
    const errorLog = path.join(this.logsDir, 'backup_errors.log');
    const msg = `[${new Date().toISOString()}] ${error.stack || error.message}\n`;
    await fs.appendFile(errorLog, msg);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

// CLI usage
if (require.main === module) {
  const manager = new BackupManager();
  manager.performBackup(process.argv[2] ? JSON.parse(process.argv[2]) : {})
    .then(res => {
      if (!res.success) process.exit(1);
    });
}

module.exports = BackupManager;