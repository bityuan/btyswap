const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// 需要压缩的文件扩展名
const COMPRESS_EXTENSIONS = ['.js', '.css', '.html', '.json', '.xml', '.txt'];

// 需要压缩的文件大小阈值（字节）
const MIN_SIZE = 1024; // 1KB

async function shouldCompressFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return COMPRESS_EXTENSIONS.includes(ext);
}

async function compressFile(filePath) {
  try {
    const stats = await stat(filePath);
    
    // 只压缩大于阈值的文件
    if (stats.size < MIN_SIZE) {
      console.log(`跳过小文件: ${filePath}`);
      return;
    }

    const content = fs.readFileSync(filePath);
    const compressed = await gzip(content, { level: 9 }); // 最高压缩级别
    
    const gzipPath = filePath + '.gz';
    fs.writeFileSync(gzipPath, compressed);
    
    const originalSize = stats.size;
    const compressedSize = compressed.length;
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    
    console.log(`✅ 压缩完成: ${path.basename(filePath)}`);
    console.log(`   原始大小: ${(originalSize / 1024).toFixed(1)}KB`);
    console.log(`   压缩大小: ${(compressedSize / 1024).toFixed(1)}KB`);
    console.log(`   压缩率: ${compressionRatio}%`);
  } catch (error) {
    console.error(`❌ 压缩失败: ${filePath}`, error.message);
  }
}

async function processDirectory(dirPath) {
  try {
    const items = await readdir(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stats = await stat(fullPath);
      
      if (stats.isDirectory()) {
        // 递归处理子目录
        await processDirectory(fullPath);
      } else if (stats.isFile()) {
        // 检查是否需要压缩
        if (await shouldCompressFile(fullPath)) {
          await compressFile(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`❌ 处理目录失败: ${dirPath}`, error.message);
  }
}

async function main() {
  const buildDir = path.join(__dirname, '..', 'build');
  
  if (!fs.existsSync(buildDir)) {
    console.error('❌ build目录不存在，请先运行 npm run build');
    process.exit(1);
  }
  
  console.log('🚀 开始Gzip压缩...');
  console.log(`📁 处理目录: ${buildDir}`);
  
  const startTime = Date.now();
  await processDirectory(buildDir);
  const endTime = Date.now();
  
  console.log(`\n✅ Gzip压缩完成！耗时: ${endTime - startTime}ms`);
}

main().catch(console.error);
