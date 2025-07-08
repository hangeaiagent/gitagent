/**
 * SSH终端安全配置
 * 基于xterm.js最佳实践
 */

export interface SecurityConfig {
  // 连接安全
  connection: {
    maxConnections: number;
    connectionTimeout: number;
    idleTimeout: number;
    heartbeatInterval: number;
    maxReconnectAttempts: number;
    reconnectDelay: number;
  };
  
  // 密钥安全
  keyManagement: {
    keyExpirationTime: number;
    enableKeyEncryption: boolean;
    autoCleanupKeys: boolean;
    maxKeySize: number;
    allowedKeyTypes: string[];
  };
  
  // 命令安全
  commandSecurity: {
    enableCommandValidation: boolean;
    maxCommandLength: number;
    commandTimeout: number;
    dangerousCommands: string[];
    allowedCommands: string[];
  };
  
  // 会话安全
  sessionSecurity: {
    maxSessionDuration: number;
    sessionCleanupInterval: number;
    enableSessionEncryption: boolean;
    maxConcurrentSessions: number;
  };
  
  // 网络安全
  networkSecurity: {
    enableRateLimit: boolean;
    rateLimitWindow: number;
    rateLimitMaxRequests: number;
    allowedOrigins: string[];
    enableCORS: boolean;
  };
  
  // 文件传输安全
  fileTransfer: {
    maxFileSize: number;
    allowedFileTypes: string[];
    enableVirusScanning: boolean;
    uploadTimeout: number;
    downloadTimeout: number;
  };
}

export const defaultSecurityConfig: SecurityConfig = {
  connection: {
    maxConnections: 100,
    connectionTimeout: 30000,
    idleTimeout: 300000, // 5分钟
    heartbeatInterval: 30000, // 30秒
    maxReconnectAttempts: 5,
    reconnectDelay: 1000
  },
  
  keyManagement: {
    keyExpirationTime: 3600000, // 1小时
    enableKeyEncryption: true,
    autoCleanupKeys: true,
    maxKeySize: 16384, // 16KB
    allowedKeyTypes: [
      'ssh-rsa',
      'ssh-ed25519',
      'ecdsa-sha2-nistp256',
      'ecdsa-sha2-nistp384',
      'ecdsa-sha2-nistp521'
    ]
  },
  
  commandSecurity: {
    enableCommandValidation: true,
    maxCommandLength: 1000,
    commandTimeout: 300000, // 5分钟
    dangerousCommands: [
      'rm -rf /',
      'dd if=/dev/zero',
      'mkfs',
      'fdisk',
      'parted',
      'format',
      'del /f /s /q',
      'rmdir /s /q',
      'shutdown',
      'reboot',
      'halt',
      'poweroff'
    ],
    allowedCommands: [] // 空数组表示不限制
  },
  
  sessionSecurity: {
    maxSessionDuration: 28800000, // 8小时
    sessionCleanupInterval: 300000, // 5分钟
    enableSessionEncryption: true,
    maxConcurrentSessions: 10
  },
  
  networkSecurity: {
    enableRateLimit: true,
    rateLimitWindow: 60000, // 1分钟
    rateLimitMaxRequests: 100,
    allowedOrigins: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://localhost:8888',
      'http://localhost:8889',
      'https://localhost:5173',
      'https://localhost:3000'
    ],
    enableCORS: true
  },
  
  fileTransfer: {
    maxFileSize: 104857600, // 100MB
    allowedFileTypes: [
      '.txt', '.log', '.json', '.xml', '.yaml', '.yml',
      '.js', '.ts', '.jsx', '.tsx', '.css', '.html',
      '.py', '.java', '.cpp', '.c', '.h', '.hpp',
      '.md', '.rst', '.conf', '.cfg', '.ini',
      '.sh', '.bash', '.zsh', '.fish',
      '.tar', '.gz', '.zip', '.rar'
    ],
    enableVirusScanning: false, // 需要额外的病毒扫描服务
    uploadTimeout: 300000, // 5分钟
    downloadTimeout: 300000 // 5分钟
  }
};

/**
 * 安全验证器
 */
export class SecurityValidator {
  private config: SecurityConfig;
  
  constructor(config: SecurityConfig = defaultSecurityConfig) {
    this.config = config;
  }
  
  /**
   * 验证SSH密钥
   */
  validateSSHKey(keyContent: string): { valid: boolean; error?: string } {
    // 检查密钥大小
    if (keyContent.length > this.config.keyManagement.maxKeySize) {
      return { valid: false, error: '密钥文件过大' };
    }
    
    // 检查密钥格式
    if (!keyContent.includes('-----BEGIN') || !keyContent.includes('-----END')) {
      return { valid: false, error: '无效的SSH密钥格式' };
    }
    
    // 检查密钥类型
    const keyTypePattern = /ssh-(?:rsa|ed25519|dss)|ecdsa-sha2-nistp(?:256|384|521)/;
    if (!keyTypePattern.test(keyContent)) {
      return { valid: false, error: '不支持的密钥类型' };
    }
    
    // 检查是否为私钥
    if (!keyContent.includes('PRIVATE KEY')) {
      return { valid: false, error: '请提供私钥文件' };
    }
    
    return { valid: true };
  }
  
  /**
   * 验证命令安全性
   */
  validateCommand(command: string): { valid: boolean; error?: string } {
    // 检查命令长度
    if (command.length > this.config.commandSecurity.maxCommandLength) {
      return { valid: false, error: '命令过长' };
    }
    
    // 检查危险命令
    const lowerCommand = command.toLowerCase();
    for (const dangerousCmd of this.config.commandSecurity.dangerousCommands) {
      if (lowerCommand.includes(dangerousCmd.toLowerCase())) {
        return { valid: false, error: `命令包含危险操作: ${dangerousCmd}` };
      }
    }
    
    // 检查允许的命令（如果配置了）
    if (this.config.commandSecurity.allowedCommands.length > 0) {
      const isAllowed = this.config.commandSecurity.allowedCommands.some(
        allowedCmd => lowerCommand.startsWith(allowedCmd.toLowerCase())
      );
      if (!isAllowed) {
        return { valid: false, error: '命令不在允许列表中' };
      }
    }
    
    // 检查特殊字符和注入攻击
    const suspiciousPatterns = [
      /;\s*rm\s+/,
      /\|\s*rm\s+/,
      /&&\s*rm\s+/,
      /`.*`/,
      /\$\(.*\)/,
      /\|\s*sh/,
      /\|\s*bash/,
      />\s*\/dev\/null.*&/
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(command)) {
        return { valid: false, error: '命令包含可疑模式' };
      }
    }
    
    return { valid: true };
  }
  
  /**
   * 验证文件传输
   */
  validateFileTransfer(filename: string, fileSize: number): { valid: boolean; error?: string } {
    // 检查文件大小
    if (fileSize > this.config.fileTransfer.maxFileSize) {
      return { valid: false, error: '文件过大' };
    }
    
    // 检查文件类型
    if (this.config.fileTransfer.allowedFileTypes.length > 0) {
      const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
      if (!this.config.fileTransfer.allowedFileTypes.includes(ext)) {
        return { valid: false, error: '不支持的文件类型' };
      }
    }
    
    // 检查文件名
    const dangerousNames = [
      'passwd', 'shadow', 'hosts', 'fstab', 'sudoers',
      'authorized_keys', 'known_hosts', 'id_rsa', 'id_ed25519'
    ];
    
    const lowerFilename = filename.toLowerCase();
    for (const dangerousName of dangerousNames) {
      if (lowerFilename.includes(dangerousName)) {
        return { valid: false, error: '文件名包含敏感内容' };
      }
    }
    
    return { valid: true };
  }
  
  /**
   * 验证会话
   */
  validateSession(sessionId: string, createdAt: Date): { valid: boolean; error?: string } {
    const now = Date.now();
    const sessionAge = now - createdAt.getTime();
    
    if (sessionAge > this.config.sessionSecurity.maxSessionDuration) {
      return { valid: false, error: '会话已过期' };
    }
    
    // 检查会话ID格式
    if (!/^ssh_session_\d+_[a-z0-9]+$/.test(sessionId)) {
      return { valid: false, error: '无效的会话ID格式' };
    }
    
    return { valid: true };
  }
  
  /**
   * 验证网络请求
   */
  validateRequest(origin: string, userAgent: string): { valid: boolean; error?: string } {
    // 检查来源
    if (this.config.networkSecurity.allowedOrigins.length > 0) {
      if (!this.config.networkSecurity.allowedOrigins.includes(origin)) {
        return { valid: false, error: '不允许的请求来源' };
      }
    }
    
    // 检查用户代理
    if (!userAgent || userAgent.length < 10) {
      return { valid: false, error: '无效的用户代理' };
    }
    
    // 检查是否为自动化工具
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python/i, /java/i
    ];
    
    for (const pattern of botPatterns) {
      if (pattern.test(userAgent)) {
        return { valid: false, error: '不允许的用户代理' };
      }
    }
    
    return { valid: true };
  }
}

/**
 * 安全中间件
 */
export class SecurityMiddleware {
  private validator: SecurityValidator;
  private rateLimitMap: Map<string, { count: number; resetTime: number }>;
  
  constructor(config: SecurityConfig = defaultSecurityConfig) {
    this.validator = new SecurityValidator(config);
    this.rateLimitMap = new Map();
  }
  
  /**
   * 速率限制中间件
   */
  rateLimit(req: any, res: any, next: any) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const config = this.validator['config'];
    
    if (!config.networkSecurity.enableRateLimit) {
      return next();
    }
    
    const windowMs = config.networkSecurity.rateLimitWindow;
    const maxRequests = config.networkSecurity.rateLimitMaxRequests;
    
    if (!this.rateLimitMap.has(clientIp)) {
      this.rateLimitMap.set(clientIp, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const clientData = this.rateLimitMap.get(clientIp)!;
    if (now > clientData.resetTime) {
      clientData.count = 1;
      clientData.resetTime = now + windowMs;
      return next();
    }
    
    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: '请求过于频繁，请稍后再试',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }
    
    clientData.count++;
    next();
  }
  
  /**
   * 请求验证中间件
   */
  validateRequest(req: any, res: any, next: any) {
    const origin = req.headers.origin;
    const userAgent = req.headers['user-agent'];
    
    const validation = this.validator.validateRequest(origin, userAgent);
    if (!validation.valid) {
      return res.status(403).json({
        success: false,
        error: validation.error
      });
    }
    
    next();
  }
  
  /**
   * 命令验证中间件
   */
  validateCommand(req: any, res: any, next: any) {
    const { command } = req.body;
    
    if (!command) {
      return next();
    }
    
    const validation = this.validator.validateCommand(command);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }
    
    next();
  }
}

/**
 * 安全工具函数
 */
export class SecurityUtils {
  /**
   * 生成安全的随机ID
   */
  static generateSecureId(prefix: string = '', length: number = 16): string {
    // 在浏览器环境中使用Web Crypto API
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint8Array(Math.ceil(length / 2));
      window.crypto.getRandomValues(array);
      const randomString = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').slice(0, length);
      return prefix ? `${prefix}_${randomString}` : randomString;
    }
    
    // 回退到Math.random()
    const randomString = Math.random().toString(36).substr(2, length);
    return prefix ? `${prefix}_${randomString}` : randomString;
  }
  
  /**
   * 加密敏感数据（简化版本）
   */
  static encryptData(data: string, key: string): string {
    // 简单的Base64编码（仅用于演示，生产环境需要更强的加密）
    const encoded = btoa(data + key);
    return encoded;
  }
  
  /**
   * 解密敏感数据（简化版本）
   */
  static decryptData(encryptedData: string, key: string): string {
    // 简单的Base64解码（仅用于演示，生产环境需要更强的解密）
    try {
      const decoded = atob(encryptedData);
      return decoded.replace(key, '');
    } catch {
      return '';
    }
  }
  
  /**
   * 清理敏感信息
   */
  static sanitizeForLog(data: any): any {
    const sensitiveKeys = ['password', 'privateKey', 'passphrase', 'token', 'secret'];
    
    if (typeof data === 'string') {
      return data.replace(/-----BEGIN[\s\S]*?-----END[^-]*-----/g, '[PRIVATE_KEY]');
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data };
      
      for (const key of sensitiveKeys) {
        if (key in sanitized) {
          sanitized[key] = '[REDACTED]';
        }
      }
      
      return sanitized;
    }
    
    return data;
  }
  
  /**
   * 验证IP地址
   */
  static isValidIP(ip: string): boolean {
    const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Pattern = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
  }
  
  /**
   * 验证端口号
   */
  static isValidPort(port: number): boolean {
    return Number.isInteger(port) && port > 0 && port <= 65535;
  }
} 