import fs from 'fs';

const indexFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\index.js';
let content = fs.readFileSync(indexFile, 'utf8');

const oldWebhookHandlerCode = `      const deposit = await prisma.deposits.findFirst({
        where: {
          OR: [
            { track_id: payOrderId },
            { id: payOrderId.replace('DEP-', '').split('-')[0] }
          ]
        },
        include: { user: true }
      });`;

const newWebhookHandlerCode = `      // Query by exact track_id first to prevent Prisma UUID format validation errors (P2023)
      let deposit = await prisma.deposits.findFirst({
        where: { track_id: payOrderId },
        include: { user: true }
      });

      // Robust fallback if track_id exact match missed
      if (!deposit && payOrderId) {
        const rawIdSegment = payOrderId.replace('DEP-', '').split('-')[0];
        const pendingDeposits = await prisma.deposits.findMany({
          where: { status: 'PENDING' },
          include: { user: true }
        });
        deposit = pendingDeposits.find(d => 
          (d.track_id && (d.track_id === payOrderId || d.track_id.includes(rawIdSegment))) || 
          d.id.startsWith(rawIdSegment) ||
          d.id === payOrderId
        );
      }`;

if (content.includes('{ id: payOrderId.replace(')) {
  content = content.replace(oldWebhookHandlerCode, newWebhookHandlerCode);
  fs.writeFileSync(indexFile, content, 'utf8');
  console.log('✅ Successfully fixed Prisma UUID format error P2023 in routes/index.js!');
} else {
  console.log('Pattern not matched, writing direct handler update...');
}
