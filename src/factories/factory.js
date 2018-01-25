import _ from 'lodash';
import SmartClass from 'smart-class';
import {Constant} from '../misc/constant';
import Exception from '../exceptions';

export default class Factory extends SmartClass {

  succeeded(action) {
    if (action.status == Constant('STATUS.REQUEST.SUCCESS')) {
      return true;
    } else {
      return false;
    }
  }

  notFound(action) {
    if (action.status == Constant('STATUS.REQUEST.ERROR') &&
        _.get(action, 'errorCode') == 404) {
      return true;
    } else {
      return false;
    }
  }

  async dispatch(action) {
    return await Store.dispatch(async (dispatch) => {
      let payload = _.isPlainObject(action) ? action : await action();
      if (!_.isEmpty(payload)) {
        this.action = payload;
        return await dispatch(payload);
      } else {
        return Exception.error("Factory can't dispatch an empty action.");
      }
    });
  }

  static async run(callback) {
    let builder = this.new();
    callback.bind(builder);
    return await callback(builder);
  }

}
