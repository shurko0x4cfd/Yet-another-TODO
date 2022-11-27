
/**
 * Yatd Основной модуль
 * @module
 */

import React, { useState, useEffect, useRef } from 'react';

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

import { fbApp, storageUrl } from './firebase-config.js'
import './shared.less';
import dayjs from 'dayjs';


// Шорткат
const cl = console.log;

/** Каталог для записей  */
const recordsDir = 'records/';

/** Объект базы данных Firebase  */
const db = getDatabase();
/** Объект базы данных FirebaseStorage  */
const  fbStorage = getStorage(fbApp, storageUrl);


/** Корневой компонент
 * @component
 */
function Yatd(props) {
	const [recordIds, setRecordIds] = useState(props.ids);

	return (
		<div className="yatd-container col">
			<RecordList recordIds={recordIds} setRecordIds={setRecordIds} />
			<BigPlus setRecordIds={setRecordIds} />
		</div>);
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
	const [record, setRecord] = useState(null);
	const [subscribed, setSubscribed] = useState(false);
	const [inEditing, setInEditing] = useState(false);
	const [time, setTime] = useState('');

	useEffect(() => {
		if (subscribed) return;
		setSubscribed(true);
		subscribeOnOneRecordChange(setRecord, props.id);
	});

	if (!record) return;

	const fail = dayjs().isAfter(record.doUpTo) && !record.done;

	return (
		<div className={"record col round-4 " +
			(record.done ? 'done-green-border ' : ' ') +
			(fail ? 'fail-red-border ' : ' ')}>

			<TopMenu record={record}
				setRecord={setRecord}
				time={time}
				setTime={setTime}
				inEditing={inEditing}
				setInEditing={setInEditing} />

			<textarea className='description fs-1' rows={1}
				placeholder='Начните вводить текст здесь'
				defaultValue={record.desc}
				onChange={evt => updField(setRecord, evt, 'desc')} />

			<BottomMenu record={record} setRecord={setRecord}
				filenames={record.files} />
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
	return (
		<div className='top-menu' >
			<form className='menu-group col' onSubmit={evt => {
				evt.preventDefault();
				updOneRecord(props.record);
			}}>

				<input className='title fs-1-3 fw-bold'
					defaultValue={props.record.title} placeholder='Придумайте заголовок'
					onChange={evt => updField(props.setRecord, evt, 'title')}
				/>
			</form>
			<div className='menu-group row'>
				{
					props.inEditing ?
						<InputTimePlace record={props.record}
							setRecord={props.setRecord}
							time={props.time}
							setTime={props.setTime}
							setInEditing={props.setInEditing} />
						:
						<div className='row'
							onClick={() => props.setInEditing(true)}>

							<div className='menu-item fc-blue'>Сделать до</div>
							<div className='menu-item fc-orng'>{props.record.doUpTo}</div>
						</div>
				}
				<div className='menu-item fc-green'
					onClick={() => markTaskDone(props.record, props.setRecord)}>

					Отметить выполненной</div>
			</div>
		</div>);
}

/**
 * Обновляет на фронте и на бэке данные записи относительно задачи
 * Отмечает задачу как выполненную
 * @param {Object} record    Запись в виде объекта
 * @param {}       setRecord Сеттер данных отдельной записи
 */
function markTaskDone(record, setRecord) {
	setRecord(record => (record['done'] = true, record));
	updOneRecord(record);
}


/**
 * Компонент поля ввода даты/времени завершения задачи
 * @component
 */
function InputTimePlace(props) {
	const ref = useRef(null);

	return (
		<form className='col'
			onSubmit={evt => {
				evt.preventDefault();
				storeTime(ref, props.setInEditing, props.record, props.setRecord);
			}}>

			<input className='date-at-input' ref={ref} defaultValue={props.time}
				placeholder={'Y-m-d H:i'}
				onBlur={() => {
					storeTime(ref, props.setInEditing, props.record, props.setRecord);
				}}

				onChange={(evt) => props.setTime(evt.target.value)}
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
function storeTime(ref, setInEditing, record, setRecord) {
	setInEditing(false);
	const dateTime = dayjs(ref.current.value).format('ddd MMM DD YYYY HH:mm');

	dateTime !== 'Invalid Date' &&
		setRecord(record => (record['doUpTo'] = dateTime, record));

	setTimeout(() => updOneRecord(record));
}


/**
 * Компонент верхнего меню
 * @component
 */
function BottomMenu(props) {
	return (
		<div className='bottom-menu'>
			<div className='row'>
				<div className='menu-group'>
					<div className='file-names'>
						{props.filenames ?
							props.filenames.map(itm =>
								<FileNameItem key={itm.id} item={itm}
									setRecord={props.setRecord} />) : ''}
					</div>
				</div>
			</div>
			<div className='row'>
				<label className='menu-item fc-blue'>
					<input type="file" id='file' name="file" hidden={true}
						onChange={uploadFile.bind(null, props.record, props.setRecord)}
						className='upload-file-btn' />
					+ Прикрепить файл
				</label>
				<div className='menu-item fc-red' onClick={() => removeRecord(props.record)}>
					Удалить запись
				</div>
				<div className='menu-item fc-green'
					onClick={() => updOneRecord(props.record)}>

					Сохранить
				</div>
			</div>
		</div>
	);
}


/**
 * Компонент отдельного элемента, представляющего прикреплённый файл
 * @component
 */
function FileNameItem(props) {
	const [fileUrl, setFileUrl] = useState('');

	useEffect(() => {
		if (fileUrl !== '') return;
		getFileUrl(setFileUrl, props.item.id);
	});

	if (fileUrl === '') return;

	return (
		<a className='file-names__item'
			onAuxClick={evt => handleFileOperation(evt, props.setRecord, props.item)}
			href={fileUrl} target={'_blank'} rel={'noreferrer'}>
			{props.item.originame}
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
function handleFileOperation(evt, setRecord, item) {
	evt.preventDefault();

	setRecord(record => {
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
 * Компонент элемента интерфейса, добавляющего новую запись
 * @component
 */
function BigPlus(props) {
	return (
		<div className='add-record'>
			<div className='add-record__inner'
				onClick={() => {
					const id = generateExample();
					props.setRecordIds(recordIds => [...recordIds, id]);
				}}>
				+
			</div>
		</div>);
}


/**
 * Подписывает отдельную запись на обновления из Firebase Realtime Database
 * @param {}       setRecord Сеттер данных отдельной записи
 * @param {string} [id]      Идентификатор записи
 */
function subscribeOnOneRecordChange(setRecord, id = '') {
	const ref = dbRef(db, recordsDir + id);
	onValue(ref, snap => setRecord(snap.val()));
}


/**
 * Загружает файл в Firebase Storage
 * @param  {Object}  record    Данные записи
 * @param  {}        setRecord Сеттер данных отдельной записи
 * @param  {}        evt       Объект события
 * @return {boolean} Всегда false
 */
function uploadFile(record, setRecord, evt) {
	evt.stopPropagation();
	evt.preventDefault();

	const fileId = homeBrewUidGen();
	const file = evt.target.files[0];
	const newRef = ref(fbStorage, fileId);

	uploadBytes(newRef, file)
		.then(() => updRecordFileInfo(record, setRecord, file, fileId))
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
function updRecordFileInfo(record, setRecord, file, fileId) {
	const fileDescription = { id: fileId, originame: file.name };

	setRecord(record => {
		const files = record.files || [];
		files.push(fileDescription);
		record.files = files;
		return record;
	});
	setTimeout(() => updOneRecord(record));
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
		record.id = id = homeBrewUidGen();
		updata[id] = record;
	}

	const ref = dbRef(db, 'records');
	fbUpd(ref, updata);

	return id;
}


/**
 * Обновляет в Realtime Database указанную запись в соответствии с её состоянием на фронте
 * @param {Object} record Данные записи
 */
function updOneRecord(record) {
	const ref = dbRef(db, 'records');
	const updata = {};
	updata[record.id] = record;

	fbUpd(ref, updata);
}


/**
 * Удаляет указанную запись из Realtime Database
 * @param {Object} record Данные записи
 */
function removeRecord(record) {
	const ref = dbRef(db, 'records');
	const updata = {};
	updata[record.id] = null;

	fbUpd(ref, updata);
}


/**
 * Наивная генерация uid, но здесь достаточно такой
 * @param  {number} [len] Длина uid
 * @return {string} uid
 */
function homeBrewUidGen(len = 32) {
	if (!len--) return '';

	const nat = Math.floor(Math.random() * 16);
	const int = Math.floor(nat / 10);
	const rest = nat % 10;
	const code = int * 17 + 48 + rest;

	return String.fromCharCode(code) + homeBrewUidGen(len);
}


export default Yatd;
