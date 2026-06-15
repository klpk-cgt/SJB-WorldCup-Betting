var http = require('http');

function get(path) {
  return new Promise(function(resolve) {
    http.get('http://localhost:3000' + path, function(res) {
      var d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() {
        try { resolve({ ok: true, data: JSON.parse(d) }); }
        catch(e) { resolve({ ok: true, raw: d.substring(0, 100) }); }
      });
    }).on('error', function(e) { resolve({ ok: false, error: e.message }); });
  });
}

function post(path, body) {
  return new Promise(function(resolve) {
    var data = JSON.stringify(body);
    var opts = {
      hostname: 'localhost', port: 3000, path: path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    };
    var req = http.request(opts, function(res) {
      var d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() {
        try { resolve({ ok: true, status: res.statusCode, data: JSON.parse(d) }); }
        catch(e) { resolve({ ok: true, status: res.statusCode, raw: d.substring(0, 100) }); }
      });
    });
    req.on('error', function(e) { resolve({ ok: false, error: e.message }); });
    req.write(data);
    req.end();
  });
}

var results = [];

async function check(name, fn) {
  try {
    var r = await fn();
    var status = r.ok ? 'PASS' : 'FAIL';
    console.log('[' + status + '] ' + name);
    if (!r.ok) console.log('       ' + (r.error || r.raw || r.status));
  } catch(e) {
    console.log('[FAIL] ' + name + ' - ' + e.message);
  }
}

async function main() {
  console.log('=== 功能稳定性测试 ===\n');

  // 1. 页面与API基础可达性
  console.log('--- 核心API ---');
  await check('首页 HTML', function() { return get('/'); });
  await check('/api/matches (比赛列表)', function() { return get('/api/matches'); });
  await check('/api/leaderboards (排行榜)', function() { return get('/api/leaderboards'); });
  await check('/api/ai/daily', function() { return get('/api/ai/daily'); });

  // 2. 战报API
  console.log('\n--- 战报API ---');
  await check('/api/battle-reports', function() { return get('/api/battle-reports'); });
  await check('/api/matches/recent-reports?limit=1', function() { return get('/api/matches/recent-reports?limit=1'); });
  await check('/api/matches/m-1/post-report', function() { return get('/api/matches/m-1/post-report'); });

  // 3. 登录
  console.log('\n--- 认证 ---');
  var login = await post('/api/admin/login', { username: 'admin', password: 'admin_worldcup2026' });
  if (login.ok && login.data && login.data.token) {
    console.log('[PASS] 管理员登录');
  } else {
    console.log('[FAIL] 登录失败:', JSON.stringify(login).substring(0, 100));
  }

  // 4. 比赛详情
  console.log('\n--- 比赛详情 ---');
  await check('/api/matches/m-1 (单个比赛)', function() { return get('/api/matches/m-1'); });

  // 5. 玩法赔率检查
  console.log('\n--- 五大玩法赔率 ---');
  var matches = await get('/api/matches');
  if (matches.ok && Array.isArray(matches.data)) {
    var sample = matches.data.find(function(m) { return m.status === 'NS'; }) || matches.data[0];
    if (sample) {
      var o = sample.odds || {};
      console.log('[INFO] 样本比赛:', sample.id);
      console.log('  H2H:', o.h2h ? 'OK' : 'MISS');
      console.log('  HANDICAP:', o.handicap ? 'OK' : 'MISS');
      console.log('  CORRECT_SCORE:', (o.correctScore && o.correctScore.length > 0) ? o.correctScore.length+'选项' : 'MISS');
      console.log('  TOTAL_GOALS:', o.totalGoals ? 'OK' : 'MISS');
      console.log('  HAFU:', (o.hafu && o.hafu.length > 0) ? o.hafu.length+'选项' : 'MISS');
    }
  }

  // 6. 请求缓存测试
  console.log('\n--- 请求缓存 ---');
  var t1 = Date.now();
  await get('/api/matches');
  var t2 = Date.now();
  await get('/api/matches');
  var t3 = Date.now();
  console.log('[INFO] 首次:', (t2-t1) + 'ms,  缓存:', (t3-t2) + 'ms');

  // 7. 静态资源
  console.log('\n--- 静态资源 ---');
  await check('/assets/index-SEw90GbM.css', function() { return get('/assets/index-DozdwnAh.js'); });
  await check('favicon', function() { return get('/favicon.ico'); });

  console.log('\n=== 测试完毕 ===');
}

main();
