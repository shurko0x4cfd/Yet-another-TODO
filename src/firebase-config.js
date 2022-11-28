
import { initializeApp } from "firebase/app";


/** Конфигурация Firebase  */
export const firebaseConfig =
	Object.freeze
		({
			apiKey: "",
			authDomain: "yatd-50f7c.firebaseapp.com",
			projectId: "yatd-50f7c",
			storageBucket: "yatd-50f7c.appspot.com",
			messagingSenderId: "1008678132786",
			appId: "1:1008678132786:web:23bc9be71252a6b119302b",
			databaseURL: 'https://yatd-50f7c-default-rtdb.europe-west1.firebasedatabase.app'
		});

/** Url хранилища  Firebase  */
export const storageUrl = 'gs://yatd-50f7c.appspot.com';

/** Объект FirebaseApp  */
export const fbApp = initializeApp(firebaseConfig);
