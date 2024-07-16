'use strict';

module.exports = {
  async getSomething({ homey, query }) {
    // you can access query parameters like "/?foo=bar" through `query.foo`

    // you can access the App instance through homey.app
    const result = await homey.app.getData();

    // perform other logic like mapping result data

    return result;
  },

  async addSomething({ homey, body }) {
    // access the post body and perform some action on it.
    return homey.app.addSomething(body);
  },

  async updateSomething({ homey, params, body }) {
    return homey.app.setData(body);
  },

  async deleteSomething({ homey, params }) {
    return homey.app.deleteSomething(params.id);
  },
};