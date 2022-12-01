
/**
 * Yatd Основной модуль
 * @module
 */

import React, { useState, useEffect, useRef } from 'react';
import { homeBrewUidGen as uidGen } from './tools.js';
import BigPlus from './bem-blocks/add-record/add-record.jsx';

import {
	getStorage,
	ref,
	uploadBytes,
	getDownloadURL
} from "firebase/storage";

import {
	getDatabase,
	ref as dbRef,
	onValue,
	update as fbUpd
} from "firebase/database";

import { fbApp, firebaseConfig } from './firebase-config.js'
import './shared.less';
import dayjs from 'dayjs';


// Шорткат
const cl = console.log;

/** Каталог для записей  */
const recordsDir = 'records';

/** Объект базы данных Firebase  */
const db = getDatabase();
/** Объект хранилища Firebase Storage  */
const fbStorage = getStorage(fbApp, firebaseConfig.storageBucket);


/** Корневой компонент
 * @component
 */
function Yatd(props) {
	const recordIds = usePair(props.ids);

	return (
		<div className="yatd-container col">
			<RecordList recordIds={recordIds.val} />
			<BigPlus setRecordIds={recordIds.set} generateExample={generateExample} />
		</div>);
}


/**
 * Кастомный хук. Пакует всё в объект для доступа через точку
 * @param  {any}    Инициализирующее значение
 * @return {object} Объект со свойствами val (значение) и set (сеттер)
 */
function usePair(init) {
	const [val, set] = useState(init);
	return Object.freeze({ val, set });
}


/**
 * Записи TODO в виде списка
 * @component
 */
function RecordList(props) {
	return (
		<div className="record-list-container col">
			{props.recordIds.map(id => <Record key={id} id={id} />)}
		</div>
	);
}


/**
 * Компонент отдельной записи
 * @component
 */
function Record(props) {
	const record = usePair(null);
	const subscribed = usePair(false);
	const inEditing = usePair(false);
	const time = usePair('');

	useEffect(() => {
		subscribed.set(true);
		subscribeOnOneRecordChange(record.set, props.id);
	}, []);

	if (!record.val) return;

	/** Признак выполненности задачи */
	const done = record.val.done;
	/** Признак просроченности задачи */
	const fail = dayjs().isAfter(record.val.doUpTo) && !done;

	return (
		<div className={"record col round-4 " +
			(done ? 'done-green-border ' : ' ') +
			(fail ? 'fail-red-border ' : ' ')}>

			<TopMenu {...{ record, time, inEditing }} />

			<textarea className='description fs-1' rows={1}
				placeholder='Начните вводить текст здесь'
				defaultValue={record.val.desc}
				onChange={evt => updField(record.set, evt, 'desc')} />

			<BottomMenu {...{ record }}
				filenames={record.val.files} />
		</div>
	);
}


/**
 * Обновляет на фронте данные записи при изменении элемента типа input или textarea
 * @param {}       setRecord Сеттер данных отдельной записи
 * @param {}       evt       Объект события
 * @param {string} fieldname Имя изменяемого поля в структуре данных записи
 */
const updField = (setRecord, evt, fieldname) =>
	setRecord(record => (record[fieldname] = evt.target.value, record));


/**
 * Компонент верхнего меню
 * @component
 */
function TopMenu(props) {
	const { record, inEditing } = props;

	return (
		<menu className='top-menu' >
			<form className='menu-group col'
				onSubmit={evt => {
					evt.preventDefault();
					updOneRecord(record.val);
				}}>

				<input className='title fs-1-3 fw-bold'
					defaultValue={record.val.title} placeholder='Придумайте заголовок'
					onChange={evt => updField(record.set, evt, 'title')}
				/>
			</form>
			<menu className='menu-group row'>
				{
					inEditing.val ?
						<InputTimePlace {...props} />
						:
						<div className='row' role='button' tabIndex={0}
							aria-expanded={inEditing.val}
							onKeyDown={evt => isEnterKindKeyHint(evt.key) &&
								inEditing.set(true)}
							onClick={() => inEditing.set(true)}>

							<div className='menu-item fc-blue'>Сделать до</div>
							<div className='menu-item fc-orng'>{record.val.doUpTo}</div>
						</div>
				}
				<div className='menu-item fc-green' role='button' tabIndex={0}
					onKeyDown={evt => isEnterKindKeyHint(evt.key) &&
						markTaskDone(record)}
					onClick={() => markTaskDone(record)}>
					Отметить выполненной
				</div>
			</menu>
		</menu>);
}


/**
 * Отвечает, расценивать ли нажатие как ввод
 * @param  {string}  key Нажатая клавиша
 * @return {boolean} Был ли ввод
 */
const isEnterKindKeyHint = key =>
	key === ' ' || key === 'Enter';


/**
 * Обновляет на фронте и на бэке данные записи относительно задачи
 * Отмечает задачу как выполненную
 * @param {Object} record    Запись в виде объекта
 * @param {}       setRecord Сеттер данных отдельной записи
 */
function markTaskDone(record) {
	record.set(record => (record['done'] = true, record));
	setTimeout(() => updOneRecord(record.val));
}


/**
 * Компонент поля ввода даты/времени завершения задачи
 * @component
 */
function InputTimePlace({ record, time, inEditing }) {
	const ref = useRef(null);

	return (
		<form className='col'
			onSubmit={evt => {
				evt.preventDefault();
				storeTime(ref, inEditing, record);
			}}>

			<input className='date-at-input' ref={ref} defaultValue={time.val}
				placeholder={'год-месяц-день часы:мин'}
				onBlur={() => storeTime(ref, inEditing, record)}
				onChange={evt => time.set(evt.target.value)}
			/>
		</form>
	);
}


/**
 * Обновляет на фронте и на бэке дату завершения задачи
 * @param {}       ref          Ссылка на объект типа input
 * @param {}       setInEditing Сбрасывает флаг, сигнализирующий о том, что
 *                                  дата в процессе редактирования
 * @param {Object} record       Данные записи
 * @param {}       setRecord    Сеттер данных отдельной записи
 */
function storeTime(ref, inEditing, record) {
	inEditing.set(false);
	const dateTime = dayjs(ref.current.value).format('ddd MMM DD YYYY HH:mm');

	dateTime !== 'Invalid Date' &&
		record.set(record => (record['doUpTo'] = dateTime, record));

	setTimeout(() => updOneRecord(record.val));
}


/**
 * Компонент нижнего меню
 * @component
 */
function BottomMenu({ filenames = [], record }) {
	return (
		<menu className='bottom-menu'>
			<menu className='menu-group row'>
				<div className='file-names'>
					{filenames.map(item =>
						<FileNameItem key={item.id} {...{ item, record }} />)}
				</div>
			</menu>
			<menu className='row'>
				<label tabIndex={0} className='menu-item fc-blue'>
					<input type='file' id='file' name='file' hidden={true}
						onChange={evt => uploadFile(evt, record)}
						className='upload-file-btn' />
					+ Прикрепить файл
				</label>
				<div className='menu-item fc-red' role='button' tabIndex={0}
					onKeyDown={evt =>
						isEnterKindKeyHint(evt.key) && removeRecord(record.val)}
					onClick={() => removeRecord(record.val)}>
					Удалить запись
				</div>
				<div className='menu-item fc-green' role='button' tabIndex={0}
					onKeyDown={evt =>
						isEnterKindKeyHint(evt.key) && updOneRecord(record.val)}
					onClick={() => updOneRecord(record.val)}>
					Сохранить
				</div>
			</menu>
		</menu>
	);
}


/**
 * Компонент отдельного элемента, представляющего прикреплённый файл
 * @component
 */
function FileNameItem({ item, record }) {
	const fileUrl = usePair('');

	useEffect(() => { fileUrl.val === '' && getFileUrl(fileUrl.set, item.id) });

	if (fileUrl.val !== '') return (
		<a className='file-names__item'
			onAuxClick={evt => handleFileOperation(evt, record, item)}
			href={fileUrl.val} target={'_blank'} rel={'noreferrer'}>
			{item.originame}
		</a>
	);
}


/**
 * Обрабатывает клик средней кнопкой мыши по элементу 
 * прикреплённого файла, для его удаления из записи
 * @param  {}        evt       Объект события
 * @param  {}        setRecord Сеттер данных отдельной записи
 * @param  {Object}  item      Данные элемента прикреплённого файла
 * @return {boolean} Всегда false
 */
function handleFileOperation(evt, record, item) {
	evt.preventDefault();

	record.set(record => {
		record.files.forEach((itm, idx) => {
			if (itm.id === item.id)
				delete record.files[idx];
		});
		setTimeout(() => updOneRecord(record));

		return record;
	});

	return false;
}


/**
 * Обновляет Url файла в теге <a> компонента, педставляющего файл
 * @param {}       setFileUrl Сеттер данных Url
 * @param {string} id         Идентификатор файла в Firebase Storage
 */
function getFileUrl(setFileUrl, id) {
	const newRef = ref(fbStorage, id);
	getDownloadURL(newRef)
		.then(url => setFileUrl(url))
		.catch(e => cl(e));
}


/**
 * Подписывает отдельную запись на обновления из Firebase Realtime Database
 * @param {}       setRecord Сеттер данных отдельной записи
 * @param {string} [id]      Идентификатор записи
 */
function subscribeOnOneRecordChange(setRecord, id = '') {
	const ref = dbRef(db, recordsDir + '/' + id);
	onValue(ref, snap => setRecord(snap.val()));
}


/**
 * Загружает файл в Firebase Storage
 * @param  {Object}  record    Данные записи
 * @param  {}        setRecord Сеттер данных отдельной записи
 * @param  {}        evt       Объект события
 * @return {boolean} Всегда false
 */
function uploadFile(evt, record) {
	evt.stopPropagation();
	evt.preventDefault();

	const fileId = uidGen();
	const file = evt.target.files[0];
	const newRef = ref(fbStorage, fileId);

	uploadBytes(newRef, file)
		.then(() => updRecordFileInfo(record, file, fileId))
		.catch(arg => Object.keys(arg).lenght && cl(arg));

	return false;
}


/**
 * Обновляет данные записи в Firebase Realtime Database
 * @param  {Object} record    Данные записи
 * @param  {}       setRecord Сеттер данных отдельной записи
 * @param  {Object} file      Объект загруженного файла
 * @param  {string} fileId    Идентификатор файла в Firebase Storage
 */
function updRecordFileInfo(record, file, fileId) {
	const fileDescription = { id: fileId, originame: file.name };

	record.set(record => {
		const files = record.files || [];
		files.push(fileDescription);
		record.files = files;
		return record;
	});
	setTimeout(() => updOneRecord(record.val));
}


/**
 * Генерирует одну или несколько новых записей и добавляет в Firebase Realtime Database
 * @param  {number} [recordsNumber] Сколько записей нужно добавить (по умолчанию одна)
 * @return {string} Идентификатор последней из созданных записей
 */
function generateExample(recordsNumber = 1) {
	const doUpTo = dayjs().add(1, 'day').format('ddd MMM DD YYYY HH:mm');

	const sampleRecord =
	{
		title: '',
		desc: '',
		doUpTo,
		files: []
	};

	const updata = {};
	let id;

	for (let i = 0; i < recordsNumber; i++) {
		const record = { ...sampleRecord };
		record.id = id = uidGen();
		updata[id] = record;
	}

	const ref = dbRef(db, recordsDir);
	fbUpd(ref, updata);

	return id;
}


/**
 * Обновляет в Realtime Database указанную запись в соответствии с её состоянием на фронте
 * @param {Object} record Данные записи
 */
function updOneRecord(record) {
	const ref = dbRef(db, recordsDir);
	const updata = {};
	updata[record.id] = record;

	fbUpd(ref, updata);
}


/**
 * Удаляет указанную запись из Realtime Database
 * @param {Object} record Данные записи
 */
function removeRecord(record) {
	const ref = dbRef(db, recordsDir);
	const updata = {};
	updata[record.id] = null;

	fbUpd(ref, updata);
}


export default Yatd;
