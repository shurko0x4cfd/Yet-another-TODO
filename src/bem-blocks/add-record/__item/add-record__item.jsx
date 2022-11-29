
import './add-record__item.less';
import './_default/add-record__item_default.less';


/**
 * Элемента блока компонента "+"
 * @component
 */
const BigPlusItem = props =>
    <div className='add-record__item add-record__item_default'
        onClick={() =>
            props.setRecordIds(recordIds => [...recordIds, props.generateExample()])}>
        +
    </div>;


export default BigPlusItem;
