
/**
 * Наивная генерация uid, но здесь достаточно такой
 * @param  {number} [len] Длина uid
 * @return {string} uid
 */
 export function homeBrewUidGen(len = 32) {
	if (!len--) return '';

	const nat = Math.floor(Math.random() * 16);
	const int = Math.floor(nat / 10);
	const rest = nat % 10;
	const code = int * 17 + 48 + rest;

	return String.fromCharCode(code) + homeBrewUidGen(len);
}
