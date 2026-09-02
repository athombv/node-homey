import type { Driver } from 'homey';

type Homey = Driver['homey'];

export default {
  async getSomething({ homey, query }: {
    homey: Homey,
    query: Record<string, string>,
  }): Promise<string> {
    // you can access query parameters like "/?foo=bar" through `query.foo`

    // you can access the App instance through homey.app
    // const result = await homey.app.getSomething();
    // return result;

    // perform other logic like mapping result data

    return 'Hello from App';
  },

  async addSomething({ homey, body }: {
    homey: Homey,
    body: Record<string, unknown>,
  }): Promise<void> {
    // access the post body and perform some action on it.
    return homey.app.addSomething(body);
  },

  async updateSomething({ homey, params, body }: {
    homey: Homey,
    params: Record<string, string>,
    body: Record<string, unknown>,
  }): Promise<void> {
    return homey.app.setSomething(body);
  },

  async deleteSomething({ homey, params }: {
    homey: Homey,
    params: Record<string, string>,
  }): Promise<void> {
    return homey.app.deleteSomething(params.id);
  },
};
