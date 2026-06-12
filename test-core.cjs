/**
 * 世界杯竞猜平台核心功能集成测试
 * 测试：登录 → 下注 → 结算 → 排行榜 → 比分
 */
const http = require('http');

const BASE = 'http://localhost:3000';

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const get = (path, headers) => request('GET', path, null, headers);
const post = (path, body, headers) => request('POST', path, body, headers);
const put = (path, body, headers) => request('PUT', path, body, headers);

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${label}`);
  } else {
    failed++;
    errors.push(label);
    console.log(`  [FAIL] ${label}`);
  }
}

async function main() {
  console.log('\n========================================');
  console.log('  World Cup Betting Platform - Core Test');
  console.log('========================================\n');

  // ─── 1. 用户登录 ───
  console.log('--- 1. User Login Auth ---');

  const login1 = await post('/api/auth/login', { loginCode: 'WC1001', pin: '1234' });
  assert(login1.status === 200, 'User WC1001 login success');
  assert(login1.body.success === true, 'Login returns success=true');
  assert(login1.body.user != null, 'Returns user info');
  assert(login1.body.wallet != null, 'Returns wallet info');
  const u1Token = login1.body.user?.loginCode;
  const u1Id = login1.body.user?.id;
  console.log(`  Info: User=${login1.body.user?.displayName}, Balance=${login1.body.wallet?.balance}`);

  const login2 = await post('/api/auth/login', { loginCode: 'WC1002', pin: '1111' });
  assert(login2.status === 200, 'User WC1002 login success');
  const u2Token = login2.body.user?.loginCode;
  console.log(`  Info: User=${login2.body.user?.displayName}, Balance=${login2.body.wallet?.balance}`);

  const login3 = await post('/api/auth/login', { loginCode: 'WC1003', pin: '8888' });
  assert(login3.status === 200, 'User WC1003 login success');
  const u3Token = login3.body.user?.loginCode;
  console.log(`  Info: User=${login3.body.user?.displayName}, Balance=${login3.body.wallet?.balance}`);

  const loginFail = await post('/api/auth/login', { loginCode: 'WC1001', pin: 'wrong' });
  assert(loginFail.status === 401, 'Wrong PIN returns 401');

  const loginNoCode = await post('/api/auth/login', { loginCode: 'INVALID' });
  assert(loginNoCode.status === 401, 'Invalid loginCode returns 401');

  // ─── 2. 比赛列表和赔率 ───
  console.log('\n--- 2. Match List & Odds ---');

  const matches = await get('/api/matches');
  assert(matches.status === 200, 'Get match list success');
  assert(Array.isArray(matches.body) && matches.body.length > 0, `Match count: ${matches.body?.length}`);

  const bettableMatch = matches.body.find(
    (m) => m.operationalStatus === 'BETTABLE' && m.homeTeamId !== 'TBD' && m.awayTeamId !== 'TBD'
  );
  assert(bettableMatch != null, `Found bettable match: ${bettableMatch?.roundName || 'none'}`);
  if (bettableMatch) {
    console.log(`  Info: ${bettableMatch.homeTeam?.nameZh} vs ${bettableMatch.awayTeam?.nameZh}`);
    console.log(`  Info: Odds=${bettableMatch.odds?.h2h?.homeWin}/${bettableMatch.odds?.h2h?.draw}/${bettableMatch.odds?.h2h?.awayWin}`);
  }

  if (bettableMatch) {
    const detail = await get(`/api/matches/${bettableMatch.id}`);
    assert(detail.status === 200, 'Get match detail success');
    assert(detail.body.sentiment != null, 'Returns sentiment data');
    assert(detail.body.headToHead !== undefined, 'Returns head-to-head data');

    const snapshot = await get(`/api/predictions/snapshot/${bettableMatch.id}`);
    assert(snapshot.status === 200, 'Get odds snapshot success');
    assert(snapshot.body.odds != null, 'Snapshot contains odds');
  }

  // ─── 3. 下注流程 ───
  console.log('\n--- 3. Betting Flow (Points Deduction) ---');

  let u1BalanceBefore = login1.body.wallet?.balance || 0;

  if (bettableMatch && u1Token) {
    const bet1 = await post('/api/predictions', {
      matchId: bettableMatch.id,
      market: 'H2H',
      optionKey: 'home',
      optionLabel: `${bettableMatch.homeTeam?.nameZh || 'Home'} Win`,
      stakePoints: 500,
    }, { Authorization: u1Token });

    assert(bet1.status === 200, 'Bet request success');
    assert(bet1.body.success === true, 'Bet returns success=true');
    assert(bet1.body.prediction != null, 'Returns prediction record');
    assert(bet1.body.prediction?.status === 'PENDING', 'Prediction status is PENDING');
    assert(bet1.body.prediction?.stakePoints === 500, `Stake points: ${bet1.body.prediction?.stakePoints}`);
    assert(bet1.body.prediction?.oddsDecimal > 0, `Odds: ${bet1.body.prediction?.oddsDecimal}`);
    assert(bet1.body.prediction?.potentialReturn > 0, `Potential return: ${bet1.body.prediction?.potentialReturn}`);
    assert(bet1.body.wallet?.balance === u1BalanceBefore - 500, `Balance deducted: ${u1BalanceBefore} -> ${bet1.body.wallet?.balance}`);
    u1BalanceBefore = bet1.body.wallet?.balance;
    console.log(`  Info: Balance after bet1: ${u1BalanceBefore}`);

    // Second bet (different market)
    const bet2 = await post('/api/predictions', {
      matchId: bettableMatch.id,
      market: 'TOTAL_GOALS',
      optionKey: 'over_2_5',
      optionLabel: 'Total Goals Over 2.5',
      stakePoints: 300,
    }, { Authorization: u1Token });

    assert(bet2.status === 200, 'Second bet (total goals) success');
    assert(bet2.body.wallet?.balance === u1BalanceBefore - 300, `Balance after bet2: ${bet2.body.wallet?.balance}`);
    u1BalanceBefore = bet2.body.wallet?.balance;

    // Over-limit bet
    const betOverLimit = await post('/api/predictions', {
      matchId: bettableMatch.id,
      market: 'H2H',
      optionKey: 'draw',
      optionLabel: 'Draw',
      stakePoints: 999999,
    }, { Authorization: u1Token });
    assert(betOverLimit.status === 400, 'Over-limit bet rejected');

    // Minimum reserve test
    const betMinReserve = await post('/api/predictions', {
      matchId: bettableMatch.id,
      market: 'H2H',
      optionKey: 'away',
      optionLabel: 'Away Win',
      stakePoints: u1BalanceBefore - 50,
    }, { Authorization: u1Token });
    assert(betMinReserve.status === 400, 'Below minimum reserve rejected');

    // User2 bets on away
    const bet3 = await post('/api/predictions', {
      matchId: bettableMatch.id,
      market: 'H2H',
      optionKey: 'away',
      optionLabel: `${bettableMatch.awayTeam?.nameZh || 'Away'} Win`,
      stakePoints: 800,
    }, { Authorization: u2Token });
    assert(bet3.status === 200, 'User2 bet success');

    // User3 bets on draw
    const bet4 = await post('/api/predictions', {
      matchId: bettableMatch.id,
      market: 'H2H',
      optionKey: 'draw',
      optionLabel: 'Draw',
      stakePoints: 400,
    }, { Authorization: u3Token });
    assert(bet4.status === 200, 'User3 bet success');
  }

  // ─── 4. 竞猜记录查询 ───
  console.log('\n--- 4. Prediction Records ---');

  const myPreds = await get('/api/predictions/me', { Authorization: u1Token });
  assert(myPreds.status === 200, 'Query my predictions success');
  assert(Array.isArray(myPreds.body) && myPreds.body.length >= 2, `Prediction count: ${myPreds.body?.length}`);

  // ─── 5. 交易记录 ───
  console.log('\n--- 5. Transaction Records ---');

  const transactions = await get('/api/me/transactions', { Authorization: u1Token });
  assert(transactions.status === 200, 'Query transactions success');
  const stakes = transactions.body.filter((t) => t.type === 'PREDICTION_STAKE');
  assert(stakes.length >= 2, `Stake transaction count: ${stakes.length}`);
  if (stakes.length >= 2) {
    const sorted = [...stakes].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const consistent = sorted.every((t, i) => {
      if (i === 0) return true;
      return t.balanceBefore === sorted[i - 1].balanceAfter;
    });
    assert(consistent, 'Transaction balance continuity correct');
  }

  // ─── 6. 管理员结算测试 ───
  console.log('\n--- 6. Match Settlement (Admin) ---');

  const adminLogin = await post('/api/admin/login', {
    username: 'admin',
    password: 'admin_worldcup2026',
  });
  assert(adminLogin.status === 200, 'Admin login success');
  const adminToken = adminLogin.body.token;

  if (bettableMatch && adminToken) {
    // Update match result (PUT, not POST)
    const updateMatch = await put(`/api/admin/matches/${bettableMatch.id}`, {
      status: 'FT',
      homeScore: 2,
      awayScore: 1,
      winnerTeamId: bettableMatch.homeTeamId,
    }, { 'X-Admin-Token': adminToken });

    assert(updateMatch.status === 200, 'Admin update match result success');

    // Trigger settlement
    const settle = await post(`/api/admin/matches/${bettableMatch.id}/settle`, {}, { 'X-Admin-Token': adminToken });
    assert(settle.status === 200, 'Admin settle success');
    console.log(`  Info: Settled ${settle.body?.count} predictions`);

    // Verify settlement results
    const predsAfterSettle = await get('/api/predictions/me', { Authorization: u1Token });
    const settledPreds = predsAfterSettle.body.filter((p) => p.matchId === bettableMatch.id);

    const homeWinPred = settledPreds.find((p) => p.market === 'H2H' && p.optionKey === 'home');
    if (homeWinPred) {
      assert(homeWinPred.status === 'WON', 'Home win prediction settled as WON');
      assert(homeWinPred.settledReturn > 0, `Won return: ${homeWinPred.settledReturn}`);
      assert(homeWinPred.settledProfit > 0, `Net profit: ${homeWinPred.settledProfit}`);
      console.log(`  Info: User1 home-win bet: WON, return=${homeWinPred.settledReturn}, profit=${homeWinPred.settledProfit}`);
    }

    // User2's away bet should be LOST
    const u2Preds = await get('/api/predictions/me', { Authorization: u2Token });
    const u2AwayPred = u2Preds.body.find((p) => p.matchId === bettableMatch.id && p.optionKey === 'away');
    if (u2AwayPred) {
      assert(u2AwayPred.status === 'LOST', 'Away prediction settled as LOST');
      console.log(`  Info: User2 away-win bet: LOST`);
    }

    // User3's draw bet should be LOST
    const u3Preds = await get('/api/predictions/me', { Authorization: u3Token });
    const u3DrawPred = u3Preds.body.find((p) => p.matchId === bettableMatch.id && p.optionKey === 'draw');
    if (u3DrawPred) {
      assert(u3DrawPred.status === 'LOST', 'Draw prediction settled as LOST');
      console.log(`  Info: User3 draw bet: LOST`);
    }

    // Verify wallet balance updated
    const meAfterSettle = await get('/api/me', { Authorization: u1Token });
    assert(meAfterSettle.body.wallet?.balance > u1BalanceBefore, `Balance after settlement: ${meAfterSettle.body.wallet?.balance} (was ${u1BalanceBefore})`);
    console.log(`  Info: User1 balance after settlement: ${meAfterSettle.body.wallet?.balance}`);

    // Verify win transaction
    const txAfter = await get('/api/me/transactions', { Authorization: u1Token });
    const winTx = txAfter.body.filter((t) => t.type === 'PREDICTION_WIN');
    assert(winTx.length > 0, `Win transaction count: ${winTx.length}`);
    if (winTx.length > 0) {
      console.log(`  Info: Win transaction amount=${winTx[0].amount}, before=${winTx[0].balanceBefore}, after=${winTx[0].balanceAfter}`);
    }

    // Verify balance continuity after settlement
    const allTx = txAfter.body.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const allConsistent = allTx.every((t, i) => {
      if (i === 0) return true;
      return t.balanceBefore === allTx[i - 1].balanceAfter;
    });
    assert(allConsistent, 'All transaction balance continuity correct after settlement');
  }

  // ─── 7. 排行榜 ───
  console.log('\n--- 7. Leaderboard ---');

  const leaderboard = await get('/api/leaderboards');
  assert(leaderboard.status === 200, 'Get leaderboard success');
  assert(leaderboard.body.totalList != null, 'Contains totalList');
  assert(leaderboard.body.todayList != null, 'Contains todayList');
  assert(leaderboard.body.rateList != null, 'Contains rateList');
  assert(leaderboard.body.streakList != null, 'Contains streakList');
  assert(leaderboard.body.wonProfitList != null, 'Contains wonProfitList');
  assert(leaderboard.body.totalList?.length > 0, `Total list count: ${leaderboard.body.totalList?.length}`);

  const topUser = leaderboard.body.totalList[0];
  assert(topUser.balance != null, `Top user balance: ${topUser.balance}`);
  assert(topUser.netProfit != null, `Top user net profit: ${topUser.netProfit}`);
  assert(topUser.rate != null, `Top user win rate: ${topUser.rate}%`);
  assert(topUser.rankDelta != null, `Top user rank delta: ${topUser.rankDelta}`);
  console.log(`  Info: #1 ${topUser.displayName}, balance=${topUser.balance}, profit=${topUser.netProfit}, rate=${topUser.rate}%`);

  // Verify sorting
  const sorted = leaderboard.body.totalList.every(
    (item, i, arr) => i === 0 || arr[i - 1].balance >= item.balance
  );
  assert(sorted, 'Total list sorted by balance descending');

  // ─── 8. 实时比分和赛程 ───
  console.log('\n--- 8. Live Scores & Schedule ---');

  const matchesAfter = await get('/api/matches');
  assert(matchesAfter.status === 200, 'Get latest match list success');
  const settledMatch = matchesAfter.body.find((m) => m.id === bettableMatch?.id);
  if (settledMatch) {
    assert(settledMatch.isSettled === true, 'Match marked as settled');
    assert(settledMatch.homeScore === 2, `Home score: ${settledMatch.homeScore}`);
    assert(settledMatch.awayScore === 1, `Away score: ${settledMatch.awayScore}`);
    console.log(`  Info: Settled match: ${settledMatch.homeTeam?.nameZh} ${settledMatch.homeScore} : ${settledMatch.awayScore} ${settledMatch.awayTeam?.nameZh}`);
  }

  const bracket = await get('/api/bracket');
  assert(bracket.status === 200, 'Get bracket success');
  assert(Array.isArray(bracket.body.rounds), 'Bracket contains rounds');

  // ─── 9. 用户个人资料 ───
  console.log('\n--- 9. User Profile ---');

  const me = await get('/api/me', { Authorization: u1Token });
  assert(me.status === 200, 'Get my profile success');
  assert(me.body.wallet != null, 'Contains wallet');
  assert(me.body.profileSummary != null, 'Contains profileSummary');
  console.log(`  Info: Balance=${me.body.wallet?.balance}, Title=${me.body.profileSummary?.currentTitle}`);

  // ─── 10. 边界和安全测试 ───
  console.log('\n--- 10. Security & Edge Cases ---');

  const noAuthBet = await post('/api/predictions', {
    matchId: bettableMatch?.id,
    market: 'H2H',
    optionKey: 'home',
    optionLabel: 'Home Win',
    stakePoints: 100,
  });
  assert(noAuthBet.status === 401, 'Unauthenticated bet rejected');

  const negBet = await post('/api/predictions', {
    matchId: bettableMatch?.id,
    market: 'H2H',
    optionKey: 'home',
    optionLabel: 'Home Win',
    stakePoints: -100,
  }, { Authorization: u1Token });
  assert(negBet.status === 400, 'Negative stake rejected');

  const badMatchBet = await post('/api/predictions', {
    matchId: 'nonexistent',
    market: 'H2H',
    optionKey: 'home',
    optionLabel: 'Home Win',
    stakePoints: 100,
  }, { Authorization: u1Token });
  assert(badMatchBet.status === 404, 'Non-existent match returns 404');

  // ─── 结果汇总 ───
  console.log('\n========================================');
  console.log('  Test Results Summary');
  console.log('========================================');
  console.log(`  Passed: ${passed}  Failed: ${failed}  Total: ${passed + failed}`);
  if (errors.length > 0) {
    console.log('\n  Failed items:');
    errors.forEach((e) => console.log(`    [FAIL] ${e}`));
  }
  console.log(failed === 0 ? '\n  All tests passed!' : '\n  Some tests failed, please check!');

  // Write results to file
  const fs = require('fs');
  const result = { passed, failed, total: passed + failed, errors };
  fs.writeFileSync('h:/世界杯娱乐项目/back/klpk-cgt-s-Org v2/test-result.json', JSON.stringify(result, null, 2));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Test execution error:', e);
  process.exit(1);
});
