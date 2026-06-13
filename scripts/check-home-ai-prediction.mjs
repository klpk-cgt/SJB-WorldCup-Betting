import 'dotenv/config';

const port = Number(process.env.PORT || 5600);
const host = process.env.APP_DOMAIN || '127.0.0.1';
const protocol = process.env.APP_URL?.startsWith('https://') ? 'https' : 'http';
const url = `${protocol}://${host}:${port}/api/home/ai-prediction-card`;

async function main() {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = await response.json();
  const first = payload.matches?.[0];

  const summary = {
    success: payload.success,
    state: payload.state,
    dataSource: payload.dataSource,
    matchCount: Array.isArray(payload.matches) ? payload.matches.length : 0,
    title: payload.title,
    summary: payload.summary,
    firstMatch: first
      ? {
          matchId: first.matchId,
          home: first.home,
          away: first.away,
          predictResult: first.predictResult,
          confidence: first.confidence,
          source: first.source,
        }
      : null,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
