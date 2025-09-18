export default function Home() {
  return (
    <div className="min-h-screen grid grid-cols-[1fr_360px] bg-white text-[#111]">
      {/* Left editor area */}
      <div className="flex flex-col">
        {/* Top bar */}
        <div className="h-14 border-b border-black/10 flex items-center px-5 gap-3">
          <div className="text-sm text-black/60">Demo document</div>
          <div className="ml-auto flex items-center gap-2">
            <button className="h-8 px-3 rounded-md bg-pink-50 text-pink-700 border border-pink-200 text-xs font-medium grid place-items-center">
              Complete Writing
            </button>
          </div>
        </div>

        {/* Editor canvas */}
        <div className="flex-1 grid grid-cols-1 mx-auto w-[80%]">
            <div className="h-[80vh] grid">
              <div className="text-black/50 text-sm px-5 py-4">
                Type or paste (⌘+V) your text here or upload a document.
              </div>
           
            </div>
            {/* Bottom editor toolbar and meta */}
            <div className="flex items-center justify-between text-xs text-black/40 px-1">
              <div className="flex items-center gap-2">
                {/* Formatting toolbar (placeholders) */}
                <div className="ml-2 flex items-center gap-1">
                  <button className="h-6 min-w-6 px-2 rounded border border-black/10 text-[11px] bg-white">B</button>
                  <button className="h-6 min-w-6 px-2 rounded border border-black/10 text-[11px] bg-white">I</button>
                  <button className="h-6 min-w-6 px-2 rounded border border-black/10 text-[11px] bg-white">U</button>
                  <div className="w-px h-4 bg-black/10 mx-1" />
                  <button className="h-6 px-2 rounded border border-black/10 text-[11px] bg-white">H1</button>
                  <button className="h-6 px-2 rounded border border-black/10 text-[11px] bg-white">H2</button>
                  <div className="w-px h-4 bg-black/10 mx-1" />
                  <button className="h-6 px-2 rounded border border-black/10 text-[11px] bg-white">Link</button>
                  <button className="h-6 px-2 rounded border border-black/10 text-[11px] bg-white">• List</button>
                  <button className="h-6 px-2 rounded border border-black/10 text-[11px] bg-white">1. List</button>
                </div>
              </div>
              <div>0 words</div>
            </div>
          </div>
        </div>


      {/* Right panel */}
      <aside className="border-l border-black/10 bg-[#fafafa] flex flex-col">
        <div className="h-14 border-b border-black/10 px-4 flex items-center gap-2">
          <div className="h-9 px-3 rounded-md bg-pink-100 text-pink-700 border border-pink-200 text-xs font-medium grid place-items-center">
            Review suggestions
          </div>
          <div className="h-9 px-3 rounded-md bg-white text-black/60 border border-black/10 text-xs font-medium grid place-items-center">
            Write with generative AI
          </div>
          <div className="h-9 px-3 rounded-md bg-white text-black/60 border border-black/10 text-xs font-medium grid place-items-center text-center">
            Check for AI text & plagiarism
          </div>
        </div>

        <div className="flex-1 grid place-items-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-pink-200" />
            <div className="text-black/70 text-sm font-medium">Nothing to see yet.</div>
            <div className="text-black/40 text-xs">Suggestions will appear here.</div>
          </div>
        </div>
      </aside>
    </div>
  );
}
