import _ from 'lodash';
import Smart from '../Smart';
import resolve from '../helpers/resolve';

class ResourceCall extends Smart {

  defaults(context) { return { context }; }

  _exceptionParser(exception) {
    if (exception.response) {
      return {
        message: exception.message,
        code: exception.response.status,
        status: exception.response.statusText,
      };
    }
    return exception;
  }

  _fetchResponseParser(response) {
    const { responseType } = this.context;
    switch (responseType.toLowerCase()) {
      case 'json':
        return response.json();
      case 'text':
        return response.text();
      case 'formdata':
        return response.formData();
      case 'arraybuffer':
        return response.arrayBuffer();
      case 'blob':
        return response.blob();
      default:
        throw new Error('Unsupported response type');
    }
  }

  async _entityParser(entity) {
    const { collection, entityParser } = this.context;
    if (collection === true) {
      const parsedEntities = entity.map((value) => entityParser(value, this.context));
      return Promise.all(parsedEntities);
    }
    return entityParser(entity, this.context);
  }

  async _collectionParser(response) {
    return response.collection;
  }

  async _responseParser(rawResponse) {
    const { responseParser, collection, responseTransform, entityParser } = this.context;
    const response = resolve.call(this, responseParser, rawResponse) || rawResponse;
    let body = collection ? await this._collectionParser(response) : response;
    body = responseTransform ? this._transform(body, responseTransform) : body;
    body = entityParser ? await this._entityParser(body) : body;
    return body;
  }

  _requestParser(payload) {
    const { requestParser, requestTransform } = this.context;
    let parsedPayload = resolve.call(this, requestParser, payload) || payload;
    if (requestTransform) parsedPayload = this._transform(parsedPayload, requestTransform);
    return parsedPayload;
  }

  _transform(payload, transform) {
    const parsedPayload = _.isArray(payload) ? [] : {};
    for (const key in payload) {
      const nextKey = transform(key);
      if (_.isPlainObject(payload[key])) {
        parsedPayload[nextKey] = this._transform(payload[key], transform);
      } else {
        parsedPayload[nextKey] = payload[key];
      }
    }
    return parsedPayload;
  }

  _requestOptions(payload) {
    const { method, headers, allowCors } = this.context;
    const options = {
      method,
      credentials: 'same-origin',
      cors: allowCors ? 'cors' : 'no-cors',
      headers: new Headers(headers),
    };
    if (method !== 'GET' && method !== 'HEAD') {
      const parsedPayload = this._requestParser(payload);
      if (_.isPlainObject(parsedPayload)) {
        options.body = JSON.stringify(parsedPayload);
        options.headers.append('Content-Type', 'application/json');
      } else {
        options.body = parsedPayload;
      }
    }
    return options;
  }

  _requestUrl(baseUri, path) {
    const url = baseUri ? `${baseUri.replace(/\/$/, '')}${path}` : path;
    return url !== '/' ? url.replace(/\/$/, '') : url;
  }

  _request(payload) {
    const { baseUri, path } = this.context;
    const url = this._requestUrl(baseUri, path);
    const options = this._requestOptions(payload);
    return fetch(url, options);
  }

  call = async (payload) => {
    try {
      const response = await this._request(payload);
      if (!response.ok) {
        const error = Error(`Error fetching ${response.url}`);
        error.response = response;
        throw this._exceptionParser(error);
      }
      const rawResponse = await this._fetchResponseParser(response);
      return this._responseParser(rawResponse);
    } catch (exception) {
      throw this._exceptionParser(exception);
    }
  };

}

export default ResourceCall;
