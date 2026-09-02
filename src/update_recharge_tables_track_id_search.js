import fs from 'fs';

const pages = [
  'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-admin\\src\\app\\(dashboard)\\recharge\\approved\\page.jsx',
  'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-admin\\src\\app\\(dashboard)\\recharge\\pending\\page.jsx',
  'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-admin\\src\\app\\(dashboard)\\recharge\\rejected\\page.jsx'
];

pages.forEach(pagePath => {
  if (!fs.existsSync(pagePath)) return;
  let content = fs.readFileSync(pagePath, 'utf8');

  // Update displayData mapping to explicitly include track_id, full_track_id, and db_id
  content = content.replace(
    /paymentNumber:\s*d\.track_id\s*\|\|\s*d\.id,/g,
    "paymentNumber: d.track_id || `DEP-${d.id.substring(0,8)}`,"
  );

  content = content.replace(
    /transactionId:\s*d\.track_id\s*\|\|\s*d\.id,/g,
    "transactionId: d.id,"
  );

  // Update search filter to search track_id, paymentNumber, transactionId, phone, and amount
  const oldFilter = /const filteredData = displayData\.filter\(\(item\) => \{[\s\S]*?\n  \}\)/;
  const newFilter = `const filteredData = displayData.filter((item) => {
    const searchLower = searchTerm.toLowerCase().trim();
    if (!searchLower) return true;
    return (
      (item.userInfo.phone || "").toLowerCase().includes(searchLower) ||
      (item.paymentInfo.paymentNumber || "").toLowerCase().includes(searchLower) ||
      (item.paymentInfo.transactionId || "").toLowerCase().includes(searchLower) ||
      (item.id || "").toLowerCase().includes(searchLower) ||
      String(item.amounts.paymentAmount || "").includes(searchLower)
    );
  })`;

  content = content.replace(oldFilter, newFilter);

  fs.writeFileSync(pagePath, content, 'utf8');
  console.log(`✅ Updated ${pagePath} for enhanced track_id display & multi-field search!`);
});
