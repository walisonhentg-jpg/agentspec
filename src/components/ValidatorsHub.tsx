import { InspectorView } from './InspectorView';
import { MatrixView } from './MatrixView';
import { PhoneGmailCheckerView } from './PhoneGmailCheckerView';
import { IdentityProfile } from '../engine/identityGenerator';

export type ValidatorSubTab = 'ua' | 'contact' | 'matrix';

interface ValidatorsHubProps {
  subTab: ValidatorSubTab;
  onChangeSubTab: (t: ValidatorSubTab) => void;
  inspectorUa: string;
  onChangeInspectorUa: (ua: string) => void;
  phoneInput: string;
  gmailInput: string;
  onChangePhone: (p: string) => void;
  onChangeGmail: (g: string) => void;
  activeProfiles: IdentityProfile[];
}

export function ValidatorsHub({
  subTab,
  onChangeSubTab,
  inspectorUa,
  onChangeInspectorUa,
  phoneInput,
  gmailInput,
  onChangePhone,
  onChangeGmail,
  activeProfiles,
}: ValidatorsHubProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-6xl w-full mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          <button
            type="button"
            onClick={() => onChangeSubTab('ua')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'ua'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            UA Anti-Bot Inspector
          </button>
          <button
            type="button"
            onClick={() => onChangeSubTab('contact')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'contact'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Phone &amp; Gmail Validator
          </button>
          <button
            type="button"
            onClick={() => onChangeSubTab('matrix')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'matrix'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2025–26 Spec Matrix
          </button>
        </div>
      </div>

      {subTab === 'ua' && (
        <InspectorView inputUa={inspectorUa} onChangeUa={onChangeInspectorUa} />
      )}
      {subTab === 'contact' && (
        <PhoneGmailCheckerView
          phoneInput={phoneInput}
          gmailInput={gmailInput}
          activeProfiles={activeProfiles}
          onChangePhone={onChangePhone}
          onChangeGmail={onChangeGmail}
        />
      )}
      {subTab === 'matrix' && <MatrixView />}
    </div>
  );
}
