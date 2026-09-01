import fs from 'fs';

const accountFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src\\app\\dashboard\\account\\page.jsx';
let content = fs.readFileSync(accountFile, 'utf8');

const targetSnippet = `<div className="flex flex-col justify-center flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-[17px] font-bold text-white tracking-tight truncate">
                ID: {displayPhone || "----"}
              </h2>
              {displayPhone && (
                <button
                  onClick={handleCopyId}
                  className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer inline-flex items-center justify-center shrink-0 active:scale-95"
                  title="Copy ID"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              )}
            </div>
          </div>`;

const replacementSnippet = `<div className="flex flex-col justify-center flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[17px] font-bold text-white tracking-tight">ID:</span>
              {displayPhone ? (
                <>
                  <span className="text-[17px] font-bold text-white tracking-tight font-mono">
                    {displayPhone}
                  </span>
                  <button
                    onClick={handleCopyId}
                    className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all cursor-pointer inline-flex items-center justify-center shrink-0 active:scale-95 ml-0.5"
                    title="Copy ID"
                  >
                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                </>
              ) : (
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin my-1" />
              )}
            </div>
          </div>`;

if (content.includes('ID: {displayPhone || "----"}')) {
  content = content.replace(targetSnippet, replacementSnippet);
  fs.writeFileSync(accountFile, content, 'utf8');
  console.log('✅ Replaced ID: ---- with animated spinning loader in omni/src/app/dashboard/account/page.jsx!');
} else {
  console.log('Target string not found, inspecting file...');
}
