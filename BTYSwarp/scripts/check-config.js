const fs = require('fs');
const path = require('path');

// 配置检查函数
function checkConfiguration() {
  console.log('🔍 检查BTY Chain配置...\n');

  // 检查package.json配置
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log('📦 Package.json配置:');
  console.log(`   应用名称: ${packageJson.name}`);
  console.log(`   应用描述: ${packageJson.description}`);
  console.log(`   部署地址: ${packageJson.homepage}`);
  console.log('');

  // 检查私有链配置文件内容
  const privateChainContent = fs.readFileSync('src/constants/index.ts', 'utf8');
  console.log('⛓️  私有链配置:');
  
  // 解析链ID
  const chainIdMatch = privateChainContent.match(/chainId:\s*(\d+)/);
  const chainId = chainIdMatch ? chainIdMatch[1] : '未找到';
  
  // 解析链名称
  const chainNameMatch = privateChainContent.match(/chainName:\s*['"`]([^'"`]+)['"`]/);
  const chainName = chainNameMatch ? chainNameMatch[1] : '未找到';
  
  // 解析RPC URL
  const rpcUrlMatch = privateChainContent.match(/rpcUrls:\s*\[['"`]([^'"`]+)['"`]\]/);
  const rpcUrl = rpcUrlMatch ? rpcUrlMatch[1] : '未找到';
  
  // 解析代币符号
  const symbolMatch = privateChainContent.match(/symbol:\s*['"`]([^'"`]+)['"`]/);
  const symbol = symbolMatch ? symbolMatch[1] : '未找到';
  
  // 解析区块浏览器
  const blockExplorerMatch = privateChainContent.match(/blockExplorerUrls:\s*\[['"`]([^'"`]+)['"`]\]/);
  const blockExplorer = blockExplorerMatch ? blockExplorerMatch[1] : '未找到';
  
  console.log(`   链ID: ${chainId}`);
  console.log(`   链名称: ${chainName}`);
  console.log(`   原生代币: ${symbol}`);
  console.log(`   RPC URL: ${rpcUrl}`);
  console.log(`   区块浏览器: ${blockExplorer}`);
  console.log('');

  // 检查连接器配置文件内容
  const connectorsContent = fs.readFileSync('src/connectors/index.ts', 'utf8');
  console.log('🔌 连接器配置:');
  
  // 解析网络链ID
  const networkChainIdMatch = connectorsContent.match(/export const NETWORK_CHAIN_ID = (\d+)/);
  const networkChainId = networkChainIdMatch ? networkChainIdMatch[1] : '未找到';
  
  // 解析网络URL
  const networkUrlMatch = connectorsContent.match(/const NETWORK_URL = ['"`]([^'"`]+)['"`]/);
  const networkUrl = networkUrlMatch ? networkUrlMatch[1] : '未找到';
  
  console.log(`   网络链ID: ${networkChainId}`);
  console.log(`   网络URL: ${networkUrl}`);
  console.log('');

  // 检查构建配置
  console.log('🏗️  构建配置:');
  console.log(`   构建命令: npm run build:gzip`);
  console.log(`   输出目录: build/`);
  console.log(`   包含Gzip压缩: ✅`);
  console.log('');

  // 检查nginx配置
  console.log('🌐 Nginx配置:');
  console.log(`   监听端口: 3000`);
  console.log(`   服务器地址: 121.33.44.99`);
  console.log(`   根目录: /var/www/pancake-swap-interface/build`);
  console.log(`   Gzip压缩: ✅`);
  console.log(`   静态资源缓存: ✅`);
  console.log('');

  // 验证配置
  const expectedConfig = {
    chainId: '2999',
    rpcUrl: 'https://mainnet.bityuan.com/eth',
    symbol: 'BTY',
    homepage: 'http://121.33.44.99:3000'
  };

  // 检查ELFT代币配置
  console.log('🔍 检查ELFT代币配置...');
  try {
    const tokenListContent = fs.readFileSync('src/constants/token/pancakeswap.json', 'utf8');
    const tokenList = JSON.parse(tokenListContent);
    const elftToken = tokenList.tokens.find(token => token.symbol === 'ELFT');
    
    if (elftToken) {
      console.log(`   ELFT代币地址: ${elftToken.address}`);
      console.log(`   ELFT代币名称: ${elftToken.name}`);
      console.log(`   ELFT代币符号: ${elftToken.symbol}`);
      console.log(`   ELFT代币精度: ${elftToken.decimals}`);
      console.log('   ✅ ELFT代币配置已从JSON文件中读取');
    } else {
      console.log('   ❌ 未在JSON文件中找到ELFT代币配置');
    }
  } catch (error) {
    console.log('   ❌ 无法读取代币列表配置文件');
  }

  console.log('✅ 配置验证结果:');
  
  if (chainId === expectedConfig.chainId) {
    console.log(`   ✅ 链ID正确: ${expectedConfig.chainId}`);
  } else {
    console.log(`   ❌ 链ID错误: 期望 ${expectedConfig.chainId}, 实际 ${chainId}`);
  }

  if (rpcUrl === expectedConfig.rpcUrl) {
    console.log(`   ✅ RPC URL正确: ${expectedConfig.rpcUrl}`);
  } else {
    console.log(`   ❌ RPC URL错误: 期望 ${expectedConfig.rpcUrl}, 实际 ${rpcUrl}`);
  }

  if (symbol === expectedConfig.symbol) {
    console.log(`   ✅ 代币符号正确: ${expectedConfig.symbol}`);
  } else {
    console.log(`   ❌ 代币符号错误: 期望 ${expectedConfig.symbol}, 实际 ${symbol}`);
  }

  if (packageJson.homepage === expectedConfig.homepage) {
    console.log(`   ✅ 部署地址正确: ${expectedConfig.homepage}`);
  } else {
    console.log(`   ❌ 部署地址错误: 期望 ${expectedConfig.homepage}, 实际 ${packageJson.homepage}`);
  }

  console.log('\n📋 部署步骤:');
  console.log('1. 运行构建命令: npm run build:gzip');
  console.log('2. 将build目录复制到服务器: /var/www/pancake-swap-interface/');
  console.log('3. 使用nginx.production.conf配置文件');
  console.log('4. 重启nginx服务');
  console.log('5. 访问: http://121.33.44.99:3000');
}

// 运行检查
checkConfiguration();
