export interface UserProfile {
  name: string;
  age: string;
  role: "learner" | "therapist";
  preferredLanguage: "en-US" | "zh-CN";
  createdAt: string;
}

const PROFILE_KEY = "commpractice_profile";
const SAVED_PROFILES_KEY = "commpractice_saved_profiles";

const normalizeName = (value: string) => value.trim().toLowerCase();

const readProfiles = (): UserProfile[] => {
  const data = localStorage.getItem(SAVED_PROFILES_KEY);
  if (!data) return [];

  try {
    const parsed = JSON.parse(data) as UserProfile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeProfiles = (profiles: UserProfile[]) => {
  localStorage.setItem(SAVED_PROFILES_KEY, JSON.stringify(profiles));
};

export const getSavedProfiles = (): UserProfile[] => readProfiles();

export const signInProfile = (profile: UserProfile) => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

export const saveProfile = (profile: UserProfile) => {
  const existingProfiles = readProfiles();
  const existingIndex = existingProfiles.findIndex(
    (item) =>
      item.createdAt === profile.createdAt ||
      (normalizeName(item.name) === normalizeName(profile.name) && item.role === profile.role)
  );

  if (existingIndex >= 0) {
    existingProfiles[existingIndex] = profile;
  } else {
    existingProfiles.unshift(profile);
  }

  writeProfiles(existingProfiles);
  signInProfile(profile);
};

export const getProfile = (): UserProfile | null => {
  const data = localStorage.getItem(PROFILE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as UserProfile;
  } catch {
    return null;
  }
};

export const clearProfile = () => {
  localStorage.removeItem(PROFILE_KEY);
};
