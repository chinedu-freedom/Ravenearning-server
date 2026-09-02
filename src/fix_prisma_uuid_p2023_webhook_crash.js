import fs from 'fs';

const indexFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\index.js';
let indexContent = fs.readFileSync(indexFile, 'utf8');

const oldFind = `const orderPrefix = String(mchOrderNo).replace('DEP-', '').split('-')[0];

      const deposit = await prisma.deposits.findFirst({
        where: {
          OR: [
            { track_id: String(mchOrderNo) },
            { id: orderPrefix }
          ]
        },
        include: { user: true }
      });`;

const newFind = `const rawMchStr = String(mchOrderNo || '');
      const orderPrefix = rawMchStr.replace('DEP-', '').split('-')[0];

      const deposit = await prisma.deposits.findFirst({
        where: {
          OR: [
            { track_id: rawMchStr },
            { track_id: { contains: orderPrefix } },
            { id: { startsWith: orderPrefix } }
          ]
        },
        include: { user: true }
      });`;

indexContent = indexContent.replace(oldFind, newFind);
fs.writeFileSync(indexFile, indexContent, 'utf8');
console.log('✅ Fixed routes/index.js: Removed raw UUID match { id: orderPrefix } to eliminate P2023 Prisma crash!');
