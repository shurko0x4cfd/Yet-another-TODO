
import './add-record__item.less';


/**
 * Элемента блока компонента "+"
 * @component
 */
const BigPlusItem = props =>
    <div className='add-record__item'
        onClick={() =>
            props.setRecordIds(recordIds => [...recordIds, props.uid])}>
        +
    </div>;


export default BigPlusItem;
