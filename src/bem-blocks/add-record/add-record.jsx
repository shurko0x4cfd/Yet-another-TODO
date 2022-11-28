
import BigPlusItem from './__item/add-record__item.jsx';
import { homeBrewUidGen as uidGen } from '../../tools.js';
import './add-record.less';


/**
 * Компонент элемента интерфейса, добавляющего новую запись
 * @component
 */
const BigPlus = props =>
    <div className='add-record'>
        <BigPlusItem setRecordIds={props.setRecordIds} uid={uidGen()} />
    </div>;


export default BigPlus;
