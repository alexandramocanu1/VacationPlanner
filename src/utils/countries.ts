export const COUNTRIES = [
  {name: 'Italia', code: 'IT', flag: '🇮🇹'},
  {name: 'Franța', code: 'FR', flag: '🇫🇷'},
  {name: 'Spania', code: 'ES', flag: '🇪🇸'},
  {name: 'Grecia', code: 'GR', flag: '🇬🇷'},
  {name: 'Turcia', code: 'TR', flag: '🇹🇷'},
  {name: 'Austria', code: 'AT', flag: '🇦🇹'},
  {name: 'Croația', code: 'HR', flag: '🇭🇷'},
  {name: 'Portugalia', code: 'PT', flag: '🇵🇹'},
  {name: 'Germania', code: 'DE', flag: '🇩🇪'},
  {name: 'Ungaria', code: 'HU', flag: '🇭🇺'},
  {name: 'Bulgaria', code: 'BG', flag: '🇧🇬'},
  {name: 'România', code: 'RO', flag: '🇷🇴'},
  {name: 'Malta', code: 'MT', flag: '🇲🇹'},
  {name: 'Japonia', code: 'JP', flag: '🇯🇵'},
  {name: 'Thailand', code: 'TH', flag: '🇹🇭'},
  {name: 'SUA', code: 'US', flag: '🇺🇸'},
  {name: 'Marea Britanie', code: 'GB', flag: '🇬🇧'},
  {name: 'Olanda', code: 'NL', flag: '🇳🇱'},
  {name: 'Elveția', code: 'CH', flag: '🇨🇭'},
  {name: 'Cehia', code: 'CZ', flag: '🇨🇿'},
  {name: 'Polonia', code: 'PL', flag: '🇵🇱'},
];

export const COUNTRY_FLAGS: Record<string, string> = Object.fromEntries(
  COUNTRIES.map(c => [c.code, c.flag]),
);
