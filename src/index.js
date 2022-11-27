
/**
 * Стартовый модуль
 * @module
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './shared.less';
import Yatd from './Yatd.js';

import {
	getDatabase,
	ref as dbRef,
	get as dbGet,
} from "firebase/database";


/** Подключаем здесь основной компонент */
window.onload = async () => {
    let records = {};
    const db = getDatabase();
	const child = dbRef(db, 'records/');
	const snap = await dbGet(child);
    records = snap.val();
    if (!records) records = {};

    const yatdRoot = document.getElementById('yatd-root');
    const reactDomRoot = ReactDOM.createRoot(yatdRoot);

    reactDomRoot.render(<Yatd ids={Object.keys(records)} />);
};
