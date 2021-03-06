import _ from 'lodash';

function match(object, selector) {
  return _.filter(object, (item) => _.isMatch(item, selector));
}

export default function select(object, path, { indexKey = 'id' } = {}) {
  let value = object;
  const currentPath = [];
  const pathArray = _.isString(path) ? path.split('.') : path;
  _.each(pathArray, (selector) => {
    currentPath.push(selector);
    if (_.isArray(value)) {
      if (_.isString(selector)) {
        value = _.find(value, (item) => (item[indexKey] === selector));
      } else if (_.isPlainObject(selector)) {
        value = match(value, selector);
      }
    } else {
      value = value ? _.get(value, selector) : undefined;
    }
  });
  return value;
}
