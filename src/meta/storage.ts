// Speichert das Profil im Browser und als Datei.
import { newProfile, parseProfile, type Profile } from './profile';

const KEY = 'sternendrift-profil';

export function loadProfile(): Profile {
  try {
    const text = localStorage.getItem(KEY);
    if (text) return parseProfile(JSON.parse(text)) ?? newProfile();
  } catch {
    // Speicher gesperrt oder Daten beschädigt: mit leerem Profil weiterspielen
  }
  return newProfile();
}

export function saveProfile(profile: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // Speicher gesperrt (z. B. privates Fenster): Fortschritt gilt dann nur für diese Sitzung
  }
}

/** Bietet das Profil als Datei zum Herunterladen an. */
export function exportProfile(profile: Profile): void {
  const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'sternendrift-spielstand.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/** Lässt eine Datei auswählen und liest daraus ein Profil. Liefert null bei Abbruch oder ungültiger Datei. */
export function importProfile(): Promise<Profile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      try {
        const file = input.files?.[0];
        resolve(file ? parseProfile(JSON.parse(await file.text())) : null);
      } catch {
        resolve(null);
      }
    };
    input.click();
  });
}
