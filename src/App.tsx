import { useCallback, useEffect, useMemo, useState } from 'react';
import { GeneratorWorkspace } from './components/GeneratorWorkspace';
import { GmailCheckerView } from './components/GmailCheckerView';
import { GmailGeneratorWorkspace } from './components/GmailGeneratorWorkspace';
import { IdentityWorkspace } from './components/IdentityWorkspace';
import { NumberGeneratorWorkspace } from './components/NumberGeneratorWorkspace';
import { SidebarControls } from './components/SidebarControls';
import { ActiveTab, TopBar } from './components/TopBar';
import { ValidatorSubTab, ValidatorsHub } from './components/ValidatorsHub';
import { CountryCode, GenderFilter } from './data/identityRegistry';
import {
  BROWSER_LIST,
  BrowserType,
  DEVICE_LIST,
  DeviceType,
  FreshnessWindow,
  LocalePreset,
} from './data/uaRegistry';
import {
  GmailBatchResult,
  GmailGeneratorMode,
  GmailStyle,
  IdentityBatchResult,
  PhoneBatchResult,
  PhoneFormat,
  generateGmailsOnlyAsync,
  generateIdentitiesAsync,
  generatePhonesOnlyAsync,
  parseCanonicalGmailBase,
} from './engine/identityGenerator';
import { GuardCategory, sevenDayStore } from './engine/sevenDayStore';
import {
  DEFAULT_VERSION_RANGES,
  INDEX_TO_BROWSER,
  INDEX_TO_DEVICE,
  TrafficMode,
  UaBatchResult,
  VersionRangeFilter,
  estimateUniquePoolSize,
  generateUserAgentsAsync,
  getValidPairs,
} from './engine/uaGenerator';

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('generator');
  const [validatorSubTab, setValidatorSubTab] = useState<ValidatorSubTab>('ua');

  // Persistent 7-day history guard
  const [sevenDayGuard, setSevenDayGuard] = useState<boolean>(true);
  const [sevenDayCounts, setSevenDayCounts] = useState<Record<GuardCategory, number>>({
    ua: 0,
    phone: 0,
    addr: 0,
    gmail: 0,
  });

  // User-Agent Studio state
  const [browsers, setBrowsers] = useState<BrowserType[]>(
    BROWSER_LIST.map((b) => b.id)
  );
  const [devices, setDevices] = useState<DeviceType[]>(
    DEVICE_LIST.map((d) => d.id)
  );
  const [freshness, setFreshness] = useState<FreshnessWindow>('recent');
  const [trafficMode, setTrafficMode] = useState<TrafficMode>('unique');
  const [localePreset, setLocalePreset] = useState<LocalePreset>('global');
  const [versionRanges, setVersionRanges] = useState<VersionRangeFilter>(DEFAULT_VERSION_RANGES);
  const [customCount, setCustomCount] = useState<number>(1000);
  const [batch, setBatch] = useState<UaBatchResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressPct, setProgressPct] = useState(0);

  // Country-Locked Identity Profile Studio state
  const [countries, setCountries] = useState<CountryCode[]>(['US', 'GB', 'DE', 'FR']);
  const [gender, setGender] = useState<GenderFilter>('all');
  const [phoneFormat, setPhoneFormat] = useState<PhoneFormat>('international');
  const [profileCustomCount, setProfileCustomCount] = useState<number>(500);
  const [identityBatch, setIdentityBatch] = useState<IdentityBatchResult | null>(null);
  const [isGeneratingProfiles, setIsGeneratingProfiles] = useState(false);
  const [profileProgressPct, setProfileProgressPct] = useState(0);

  // Dedicated Country-Locked Gmail Generator state
  const [gmailMode, setGmailMode] = useState<GmailGeneratorMode>('real_dots');
  const [baseRealGmail, setBaseRealGmail] = useState<string>(() => {
    try {
      return localStorage.getItem('agentspec.realBaseGmail') ?? '';
    } catch {
      return '';
    }
  });
  const [gmailCountry, setGmailCountry] = useState<CountryCode>('US');
  const [gmailGender, setGmailGender] = useState<GenderFilter>('all');
  const [gmailStyle, setGmailStyle] = useState<GmailStyle>('mixed');
  const [gmailCustomCount, setGmailCustomCount] = useState<number>(500);
  const [gmailBatch, setGmailBatch] = useState<GmailBatchResult | null>(null);
  const [isGeneratingGmails, setIsGeneratingGmails] = useState(false);
  const [gmailProgressPct, setGmailProgressPct] = useState(0);

  const handleChangeBaseRealGmail = useCallback((email: string) => {
    setBaseRealGmail(email);
    try {
      localStorage.setItem('agentspec.realBaseGmail', email);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Dedicated Country-Locked Number Generator state
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>('US');
  const [phoneUsCity, setPhoneUsCity] = useState<string>('ALL');
  const [phoneFormatStandalone, setPhoneFormatStandalone] = useState<PhoneFormat>('international');
  const [phoneCustomCount, setPhoneCustomCount] = useState<number>(500);
  const [phoneBatch, setPhoneBatch] = useState<PhoneBatchResult | null>(null);
  const [isGeneratingPhones, setIsGeneratingPhones] = useState(false);
  const [phoneProgressPct, setPhoneProgressPct] = useState(0);

  // Validator inputs
  const [inspectorUa, setInspectorUa] = useState<string>(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36'
  );
  const [checkPhone, setCheckPhone] = useState<string>('+1 (212) 648-3910');
  const [checkGmail, setCheckGmail] = useState<string>('james.carter94@gmail.com');
  const [checkAddress, setCheckAddress] = useState<string>(
    '350 Fifth Avenue, New York, NY 10118, USA'
  );

  const validPairsCount = useMemo(
    () => getValidPairs(browsers, devices).length,
    [browsers, devices]
  );

  const estimatedPool = useMemo(
    () =>
      estimateUniquePoolSize({
        browsers,
        devices,
        freshness,
        localePreset,
        versionRanges,
      }),
    [browsers, devices, freshness, localePreset, versionRanges]
  );

  const runGeneration = useCallback(
    async (countToGenerate: number, modeOverride?: TrafficMode) => {
      if (isGenerating) return;
      setIsGenerating(true);
      setProgressPct(0);

      try {
        const result = await generateUserAgentsAsync(
          {
            browsers,
            devices,
            freshness,
            trafficMode: modeOverride ?? trafficMode,
            localePreset,
            versionRanges,
            sevenDayGuard,
            count: countToGenerate,
          },
          (pct) => setProgressPct(pct)
        );
        setBatch(result);
      } finally {
        setIsGenerating(false);
        setProgressPct(0);
      }
    },
    [browsers, devices, freshness, trafficMode, localePreset, versionRanges, sevenDayGuard, isGenerating]
  );

  const runProfileGeneration = useCallback(
    async (countToGenerate: number) => {
      if (isGeneratingProfiles) return;
      setIsGeneratingProfiles(true);
      setProfileProgressPct(0);

      try {
        const result = await generateIdentitiesAsync(
          {
            countries,
            gender,
            phoneFormat,
            sevenDayGuard,
            count: countToGenerate,
          },
          (pct) => setProfileProgressPct(pct)
        );
        setIdentityBatch(result);
      } finally {
        setIsGeneratingProfiles(false);
        setProfileProgressPct(0);
      }
    },
    [countries, gender, phoneFormat, sevenDayGuard, isGeneratingProfiles]
  );

  const runGmailGeneration = useCallback(
    async (countToGenerate: number, modeOverride?: GmailGeneratorMode, baseOverride?: string) => {
      if (isGeneratingGmails) return;
      setIsGeneratingGmails(true);
      setGmailProgressPct(0);

      try {
        const result = await generateGmailsOnlyAsync(
          {
            mode: modeOverride ?? gmailMode,
            baseRealGmail: baseOverride ?? baseRealGmail,
            country: gmailCountry,
            gender: gmailGender,
            style: gmailStyle,
            sevenDayGuard,
            count: countToGenerate,
          },
          (pct) => setGmailProgressPct(pct)
        );
        setGmailBatch(result);
      } finally {
        setIsGeneratingGmails(false);
        setGmailProgressPct(0);
      }
    },
    [gmailMode, baseRealGmail, gmailCountry, gmailGender, gmailStyle, sevenDayGuard, isGeneratingGmails]
  );

  const runPhoneGeneration = useCallback(
    async (countToGenerate: number) => {
      if (isGeneratingPhones) return;
      setIsGeneratingPhones(true);
      setPhoneProgressPct(0);

      try {
        const result = await generatePhonesOnlyAsync(
          {
            country: phoneCountry,
            usCity: phoneUsCity,
            phoneFormat: phoneFormatStandalone,
            sevenDayGuard,
            count: countToGenerate,
          },
          (pct) => setPhoneProgressPct(pct)
        );
        setPhoneBatch(result);
      } finally {
        setIsGeneratingPhones(false);
        setPhoneProgressPct(0);
      }
    },
    [phoneCountry, phoneUsCity, phoneFormatStandalone, sevenDayGuard, isGeneratingPhones]
  );

  // Initialize IndexedDB permanent UA + 7-day identity history, then load initial preview batches
  useEffect(() => {
    let cancelled = false;
    const unsubscribe = sevenDayStore.subscribe(() => {
      setSevenDayCounts(sevenDayStore.getCounts());
    });

    void (async () => {
      await sevenDayStore.init();
      if (cancelled) return;
      setSevenDayCounts(sevenDayStore.getCounts());

      const [uaRes, idRes, phoneRes] = await Promise.all([
        generateUserAgentsAsync({
          browsers: BROWSER_LIST.map((b) => b.id),
          devices: DEVICE_LIST.map((d) => d.id),
          freshness: 'recent',
          trafficMode: 'unique',
          localePreset: 'global',
          versionRanges: DEFAULT_VERSION_RANGES,
          sevenDayGuard: true,
          skipHistoryRecord: false,
          count: 1000,
        }),
        generateIdentitiesAsync({
          countries: ['US', 'GB', 'DE', 'FR'],
          gender: 'all',
          phoneFormat: 'international',
          sevenDayGuard: true,
          skipHistoryRecord: true,
          count: 500,
        }),
        generatePhonesOnlyAsync({
          country: 'US',
          usCity: 'ALL',
          phoneFormat: 'international',
          sevenDayGuard: true,
          skipHistoryRecord: true,
          count: 200,
        }),
      ]);

      if (cancelled) return;
      setBatch(uaRes);
      setIdentityBatch(idRes);
      setPhoneBatch(phoneRes);

      if (parseCanonicalGmailBase(baseRealGmail)) {
        const gmailRes = await generateGmailsOnlyAsync({
          mode: 'real_dots',
          baseRealGmail,
          country: 'US',
          gender: 'all',
          style: 'mixed',
          sevenDayGuard: true,
          skipHistoryRecord: true,
          count: 500,
        });
        if (!cancelled) setGmailBatch(gmailRes);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const handleToggleBrowser = (id: BrowserType) => {
    setBrowsers((prev) => {
      if (prev.includes(id)) {
        return prev.length > 1 ? prev.filter((x) => x !== id) : prev;
      }
      return [...prev, id];
    });
  };

  const handleToggleDevice = (id: DeviceType) => {
    setDevices((prev) => {
      if (prev.includes(id)) {
        return prev.length > 1 ? prev.filter((x) => x !== id) : prev;
      }
      return [...prev, id];
    });
  };

  const handleToggleCountry = (c: CountryCode) => {
    setCountries((prev) => {
      if (prev.includes(c)) {
        return prev.length > 1 ? prev.filter((x) => x !== c) : prev;
      }
      return [...prev, c];
    });
  };

  const handleClearSevenDay = () => {
    void sevenDayStore.clearAll();
  };

  // UA Exports
  const handleExportTxt = () => {
    if (!batch || batch.lines.length === 0) return;
    const content = batch.lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    triggerBlobDownload(blob, `user-agents-${batch.lines.length}.txt`);
  };

  const handleExportCsv = () => {
    if (!batch || batch.lines.length === 0) return;
    const chunks: string[] = ['user_agent,browser,device\n'];
    const total = batch.lines.length;
    for (let i = 0; i < total; i++) {
      const escaped = batch.lines[i].replace(/"/g, '""');
      const b = INDEX_TO_BROWSER[batch.browserCodes[i]];
      const d = INDEX_TO_DEVICE[batch.deviceCodes[i]];
      chunks.push(`"${escaped}",${b},${d}\n`);
    }
    const blob = new Blob(chunks, { type: 'text/csv;charset=utf-8' });
    triggerBlobDownload(blob, `user-agents-${total}.csv`);
  };

  const handleExportJson = () => {
    if (!batch || batch.lines.length === 0) return;
    const blob = new Blob([JSON.stringify(batch.lines, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    triggerBlobDownload(blob, `user-agents-${batch.lines.length}.json`);
  };

  // Profile Exports
  const handleExportProfilesCsv = () => {
    if (!identityBatch || identityBatch.profiles.length === 0) return;
    const chunks: string[] = [
      'full_name,first_name,last_name,gender,country,country_code,street_address,city,state_region,postal_code,phone,gmail\n',
    ];
    for (const p of identityBatch.profiles) {
      const row = [
        p.fullName,
        p.firstName,
        p.lastName,
        p.gender,
        p.country,
        p.countryCode,
        p.streetAddress,
        p.city,
        p.stateOrRegion,
        p.postalCode,
        p.phone,
        p.gmail,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',');
      chunks.push(`${row}\n`);
    }
    const blob = new Blob(chunks, { type: 'text/csv;charset=utf-8' });
    triggerBlobDownload(blob, `profiles-${identityBatch.profiles.length}.csv`);
  };

  const handleExportProfilesTxt = () => {
    if (!identityBatch || identityBatch.profiles.length === 0) return;
    const content = identityBatch.profiles
      .map((p) => `${p.fullName} | ${p.gender} | ${p.fullAddress} | ${p.phone} | ${p.gmail}`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    triggerBlobDownload(blob, `profiles-${identityBatch.profiles.length}.txt`);
  };

  const handleExportProfilesJson = () => {
    if (!identityBatch || identityBatch.profiles.length === 0) return;
    const blob = new Blob([JSON.stringify(identityBatch.profiles, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    triggerBlobDownload(blob, `profiles-${identityBatch.profiles.length}.json`);
  };

  // Gmail-only Exports
  const handleExportGmailsTxt = () => {
    if (!gmailBatch || gmailBatch.items.length === 0) return;
    const content = gmailBatch.items.map((item) => item.gmail).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    triggerBlobDownload(blob, `gmails-${gmailCountry.toLowerCase()}-${gmailBatch.items.length}.txt`);
  };

  const handleExportGmailsCsv = () => {
    if (!gmailBatch || gmailBatch.items.length === 0) return;
    const chunks: string[] = ['gmail,full_name,gender,country,country_code\n'];
    for (const item of gmailBatch.items) {
      const row = [item.gmail, item.fullName, item.gender, item.country, item.countryCode]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',');
      chunks.push(`${row}\n`);
    }
    const blob = new Blob(chunks, { type: 'text/csv;charset=utf-8' });
    triggerBlobDownload(blob, `gmails-${gmailCountry.toLowerCase()}-${gmailBatch.items.length}.csv`);
  };

  const handleExportGmailsJson = () => {
    if (!gmailBatch || gmailBatch.items.length === 0) return;
    const blob = new Blob([JSON.stringify(gmailBatch.items, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    triggerBlobDownload(blob, `gmails-${gmailCountry.toLowerCase()}-${gmailBatch.items.length}.json`);
  };

  // Number-only Exports
  const handleExportPhonesTxt = () => {
    if (!phoneBatch || phoneBatch.items.length === 0) return;
    const content = phoneBatch.items.map((item) => item.phone).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    triggerBlobDownload(blob, `numbers-${phoneCountry.toLowerCase()}-${phoneBatch.items.length}.txt`);
  };

  const handleExportPhonesCsv = () => {
    if (!phoneBatch || phoneBatch.items.length === 0) return;
    const chunks: string[] = ['phone,e164,country,country_code,area_or_city\n'];
    for (const item of phoneBatch.items) {
      const row = [item.phone, item.e164, item.country, item.countryCode, item.areaOrCity]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',');
      chunks.push(`${row}\n`);
    }
    const blob = new Blob(chunks, { type: 'text/csv;charset=utf-8' });
    triggerBlobDownload(blob, `numbers-${phoneCountry.toLowerCase()}-${phoneBatch.items.length}.csv`);
  };

  const handleExportPhonesJson = () => {
    if (!phoneBatch || phoneBatch.items.length === 0) return;
    const blob = new Blob([JSON.stringify(phoneBatch.items, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    triggerBlobDownload(blob, `numbers-${phoneCountry.toLowerCase()}-${phoneBatch.items.length}.json`);
  };

  const handleInspectUa = (ua: string) => {
    setInspectorUa(ua);
    setValidatorSubTab('ua');
    setActiveTab('validators');
  };

  const handleSwitchToOrganic = () => {
    setTrafficMode('organic');
    void runGeneration(customCount, 'organic');
  };

  const topBarExport = (() => {
    if (activeTab === 'identities') {
      const count = identityBatch?.profiles.length ?? 0;
      return {
        hasResults: count > 0,
        resultCount: count,
        exportLabel: count > 0 ? `Export ${count.toLocaleString('en-IN')} (.csv)` : undefined,
        onQuickDownload: handleExportProfilesCsv,
      };
    }
    if (activeTab === 'gmail-gen') {
      const count = gmailBatch?.items.length ?? 0;
      return {
        hasResults: count > 0,
        resultCount: count,
        exportLabel: count > 0 ? `Export ${count.toLocaleString('en-IN')} (.txt)` : undefined,
        onQuickDownload: handleExportGmailsTxt,
      };
    }
    if (activeTab === 'number-gen') {
      const count = phoneBatch?.items.length ?? 0;
      return {
        hasResults: count > 0,
        resultCount: count,
        exportLabel: count > 0 ? `Export ${count.toLocaleString('en-IN')} (.txt)` : undefined,
        onQuickDownload: handleExportPhonesTxt,
      };
    }
    const count = batch?.lines.length ?? 0;
    return {
      hasResults: count > 0,
      resultCount: count,
      exportLabel: undefined,
      onQuickDownload: handleExportTxt,
    };
  })();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopBar
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        hasResults={topBarExport.hasResults}
        resultCount={topBarExport.resultCount}
        exportLabel={topBarExport.exportLabel}
        onQuickDownload={topBarExport.onQuickDownload}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'generator' && (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <SidebarControls
              browsers={browsers}
              devices={devices}
              freshness={freshness}
              trafficMode={trafficMode}
              localePreset={localePreset}
              versionRanges={versionRanges}
              sevenDayGuard={sevenDayGuard}
              protectedUaCount={sevenDayCounts.ua}
              estimatedPool={estimatedPool}
              onToggleBrowser={handleToggleBrowser}
              onSetBrowsers={setBrowsers}
              onToggleDevice={handleToggleDevice}
              onSetDevices={setDevices}
              onChangeFreshness={setFreshness}
              onChangeTrafficMode={setTrafficMode}
              onChangeLocale={setLocalePreset}
              onChangeVersionRanges={setVersionRanges}
              onToggleSevenDay={setSevenDayGuard}
              onClearSevenDay={handleClearSevenDay}
            />

            <GeneratorWorkspace
              batch={batch}
              isGenerating={isGenerating}
              progressPct={progressPct}
              customCount={customCount}
              validPairsCount={validPairsCount}
              trafficMode={trafficMode}
              sevenDayGuard={sevenDayGuard}
              onChangeCustomCount={setCustomCount}
              onGenerate={(n) => void runGeneration(n)}
              onSwitchToOrganic={handleSwitchToOrganic}
              onInspectUa={handleInspectUa}
              onExportTxt={handleExportTxt}
              onExportCsv={handleExportCsv}
              onExportJson={handleExportJson}
            />
          </div>
        )}

        {activeTab === 'identities' && (
          <IdentityWorkspace
            countries={countries}
            gender={gender}
            phoneFormat={phoneFormat}
            sevenDayGuard={sevenDayGuard}
            protectedCount={sevenDayCounts.addr + sevenDayCounts.phone + sevenDayCounts.gmail}
            customCount={profileCustomCount}
            batch={identityBatch}
            isGenerating={isGeneratingProfiles}
            progressPct={profileProgressPct}
            onToggleCountry={handleToggleCountry}
            onSetCountries={setCountries}
            onChangeGender={setGender}
            onChangePhoneFormat={setPhoneFormat}
            onToggleSevenDay={setSevenDayGuard}
            onClearSevenDay={handleClearSevenDay}
            onChangeCustomCount={setProfileCustomCount}
            onGenerate={(n) => void runProfileGeneration(n)}
            onVerifyProfile={(phone, gmail, address) => {
              setCheckPhone(phone);
              setCheckGmail(gmail);
              setCheckAddress(address);
              setValidatorSubTab('contact');
              setActiveTab('validators');
            }}
            onExportCsv={handleExportProfilesCsv}
            onExportTxt={handleExportProfilesTxt}
            onExportJson={handleExportProfilesJson}
          />
        )}

        {activeTab === 'gmail-gen' && (
          <GmailGeneratorWorkspace
            mode={gmailMode}
            baseRealGmail={baseRealGmail}
            country={gmailCountry}
            gender={gmailGender}
            style={gmailStyle}
            sevenDayGuard={sevenDayGuard}
            protectedGmailCount={sevenDayCounts.gmail}
            customCount={gmailCustomCount}
            batch={gmailBatch}
            isGenerating={isGeneratingGmails}
            progressPct={gmailProgressPct}
            onChangeMode={(m) => {
              setGmailMode(m);
              if (m === 'synthetic' || parseCanonicalGmailBase(baseRealGmail)) {
                void runGmailGeneration(gmailCustomCount, m);
              } else {
                setGmailBatch(null);
              }
            }}
            onChangeBaseRealGmail={handleChangeBaseRealGmail}
            onChangeCountry={setGmailCountry}
            onChangeGender={setGmailGender}
            onChangeStyle={setGmailStyle}
            onToggleSevenDay={setSevenDayGuard}
            onClearSevenDay={handleClearSevenDay}
            onChangeCustomCount={setGmailCustomCount}
            onGenerate={(n, baseOverride) => void runGmailGeneration(n, undefined, baseOverride)}
            onVerifyGmail={(gmail) => {
              setCheckGmail(gmail);
              setActiveTab('gmail-check');
            }}
            onExportTxt={handleExportGmailsTxt}
            onExportCsv={handleExportGmailsCsv}
            onExportJson={handleExportGmailsJson}
          />
        )}

        {activeTab === 'number-gen' && (
          <NumberGeneratorWorkspace
            country={phoneCountry}
            usCity={phoneUsCity}
            phoneFormat={phoneFormatStandalone}
            sevenDayGuard={sevenDayGuard}
            protectedPhoneCount={sevenDayCounts.phone}
            customCount={phoneCustomCount}
            batch={phoneBatch}
            isGenerating={isGeneratingPhones}
            progressPct={phoneProgressPct}
            onChangeCountry={setPhoneCountry}
            onChangeUsCity={setPhoneUsCity}
            onChangePhoneFormat={setPhoneFormatStandalone}
            onToggleSevenDay={setSevenDayGuard}
            onClearSevenDay={handleClearSevenDay}
            onChangeCustomCount={setPhoneCustomCount}
            onGenerate={(n) => void runPhoneGeneration(n)}
            onVerifyPhone={(phone) => {
              setCheckPhone(phone);
              setValidatorSubTab('contact');
              setActiveTab('validators');
            }}
            onExportTxt={handleExportPhonesTxt}
            onExportCsv={handleExportPhonesCsv}
            onExportJson={handleExportPhonesJson}
          />
        )}

        {activeTab === 'gmail-check' && (
          <GmailCheckerView
            gmailInput={checkGmail}
            onChangeGmail={setCheckGmail}
            generatedGmails={
              gmailBatch?.items.length
                ? gmailBatch.items.map((i) => i.gmail)
                : identityBatch?.profiles.map((p) => p.gmail) ?? []
            }
          />
        )}

        {activeTab === 'validators' && (
          <ValidatorsHub
            subTab={validatorSubTab}
            onChangeSubTab={setValidatorSubTab}
            inspectorUa={inspectorUa}
            onChangeInspectorUa={setInspectorUa}
            phoneInput={checkPhone}
            gmailInput={checkGmail}
            addressInput={checkAddress}
            onChangePhone={setCheckPhone}
            onChangeGmail={setCheckGmail}
            onChangeAddress={setCheckAddress}
            activeProfiles={identityBatch?.profiles ?? []}
          />
        )}
      </main>
    </div>
  );
}
