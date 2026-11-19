import {
  ANDROID_DEVICES,
  ANDROID_OS_LIST,
  CHROMIUM_RELEASES,
  FIREFOX_RELEASES,
  IOS_RELEASES,
  IPHONE_MODELS,
  SAMSUNG_BROWSER_PAIRS,
} from '../data/uaRegistry';

export function MatrixView() {
  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h1 className="font-display text-xl font-bold text-slate-900 tracking-tight">
          2025–2026 Verified Specification Matrix
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl">
          Covers Chrome 132–158, Edge 132–157, Firefox 138–160, Safari 18.3–27.2, Samsung Internet 27–31, YouTube App, and Android System WebView with strict OS, SDK, and release-branch coherence.
        </p>
        <p className="text-xs text-slate-500 mt-1.5 max-w-3xl">
          Note: Published software version ranges verify branch and build syntax coherence; a User-Agent string alone cannot verify physical device authenticity.
        </p>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-6 pt-5 border-t border-slate-100 text-xs">
          <div>
            <h2 className="font-semibold text-slate-900 mb-1.5">Chrome (132–158) &amp; Edge (132–157)</h2>
            <p className="text-slate-600 leading-relaxed">
              Chrome 158 &amp; Edge 157 reflect latest Stable releases (Chrome 159 Early Stable &amp; Edge 158 Beta excluded). WebViews &amp; CriOS use exact milestone branches.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 mb-1.5">Safari (18.3–27.2)</h2>
            <p className="text-slate-600 leading-relaxed">
              Safari 27.2 is latest Stable (27.3 Beta excluded). Released models (<code className="font-mono text-slate-900">iPhone14,7</code>–<code className="font-mono text-slate-900">iPhone18,5</code>) enforce minimum iOS versions.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 mb-1.5">Firefox (138–160)</h2>
            <p className="text-slate-600 leading-relaxed">
              Includes through Firefox 160.0.1. Desktop Firefox pairs <code className="font-mono text-slate-900">Gecko/20100101</code> with matching <code className="font-mono text-slate-900">rv:</code> and <code className="font-mono text-slate-900">Firefox/</code> tokens; Android pairs <code className="font-mono text-slate-900">Gecko/ver</code>.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 mb-1.5">Samsung (27–31) &amp; WebView</h2>
            <p className="text-slate-600 leading-relaxed">
              Samsung Browser (<code className="font-mono text-slate-900">27.0</code>–<code className="font-mono text-slate-900">31.0</code>) pairs with authentic Chromium milestones; Android System WebView (<code className="font-mono text-slate-900">; wv</code>) is separated from native YouTube App (<code className="font-mono text-slate-900">Cronet/</code>).
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chromium Release Branches */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Chrome &amp; Edge Milestones (132–158)</h2>
            <span className="text-xs text-slate-500 font-mono tabular-nums">{CHROMIUM_RELEASES.length} versions</span>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 px-4">Major</th>
                  <th className="py-2.5 px-4">Branch</th>
                  <th className="py-2.5 px-4">Android / iOS Patches</th>
                  <th className="py-2.5 px-4">Edge Branch (D / M)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {CHROMIUM_RELEASES.map((r) => (
                  <tr key={r.major} className="hover:bg-slate-50/70">
                    <td className="py-2 px-4 font-semibold text-slate-900">{r.major}.0</td>
                    <td className="py-2 px-4 text-slate-700">{r.branch}</td>
                    <td className="py-2 px-4 text-slate-600">
                      A: {r.androidPatches.join(',')}
                      {r.iosPatches.length > 0 ? ` · iOS: ${r.iosPatches.join(',')}` : ''}
                    </td>
                    <td className="py-2 px-4 text-slate-600">
                      {r.edgeBranch}
                      {r.edgeDesktopPatches.length > 0 ? ` (D:${r.edgeDesktopPatches.join(',')}` : ' (Beta'}
                      {r.edgeAndroidPatches.length > 0 ? ` M:${r.edgeAndroidPatches.join(',')})` : ')'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* iOS & Safari Build Pairings */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Safari &amp; iOS Build Map (18.3–27.2)</h2>
            <span className="text-xs text-slate-500 font-mono tabular-nums">{IOS_RELEASES.length} versions</span>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 px-4">Safari</th>
                  <th className="py-2.5 px-4">iOS Version</th>
                  <th className="py-2.5 px-4">Apple Build IDs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {IOS_RELEASES.map((ios) => (
                  <tr key={ios.osDot} className="hover:bg-slate-50/70">
                    <td className="py-2 px-4 font-semibold text-slate-900">Safari {ios.safariVersion}</td>
                    <td className="py-2 px-4 text-slate-700">iOS {ios.osDot}</td>
                    <td className="py-2 px-4 text-slate-600">{ios.buildIds.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Firefox & Samsung Internet */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Firefox (138–160) &amp; Samsung Internet (27–31)</h2>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {FIREFOX_RELEASES.length + SAMSUNG_BROWSER_PAIRS.length} releases
            </span>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 px-4">Browser</th>
                  <th className="py-2.5 px-4">Version</th>
                  <th className="py-2.5 px-4">Paired Token</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {SAMSUNG_BROWSER_PAIRS.map((sb) => (
                  <tr key={sb.sbVer} className="hover:bg-slate-50/70">
                    <td className="py-2 px-4 font-sans font-medium text-slate-900">Samsung Internet</td>
                    <td className="py-2 px-4 font-semibold text-slate-900">{sb.sbVer}</td>
                    <td className="py-2 px-4 text-slate-600">Chrome/{sb.chromeVer}</td>
                  </tr>
                ))}
                {FIREFOX_RELEASES.map((ff) => (
                  <tr key={ff.version} className="hover:bg-slate-50/70">
                    <td className="py-2 px-4 font-sans font-medium text-slate-900">Mozilla Firefox</td>
                    <td className="py-2 px-4 font-semibold text-slate-900">{ff.version}</td>
                    <td className="py-2 px-4 text-slate-600">rv:{ff.version}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Android & iPhone Hardware Matrix */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Android SDK &amp; Hardware Registry</h2>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {ANDROID_DEVICES.length} Android · {IPHONE_MODELS.length} iPhone
            </span>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 px-4">OS</th>
                  <th className="py-2.5 px-4">API SDK</th>
                  <th className="py-2.5 px-4">Verified Build IDs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {ANDROID_OS_LIST.map((os) => (
                  <tr key={os.version} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">Android {os.version}</td>
                    <td className="py-2.5 px-4 text-slate-700">API {os.sdk}</td>
                    <td className="py-2.5 px-4 text-slate-600">{os.buildIds.slice(0, 3).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
