import { Event } from '../models';

/**
 * Şimdilik yalnızca sahiplik kontrolü için gereken fonksiyonu içeriyor.
 * Not ve görev kayıtları bir etkinliğe bağlanabildiği için, o etkinliğin
 * gerçekten var olduğunu ve aynı kullanıcıya ait olduğunu doğrulamak gerekiyor
 * (TASARIM.md §8, kural 7).
 *
 * Çarşamba (issue #11) tam CRUD fonksiyonlarıyla genişletilecek.
 */
export const eventRepository = {
  async existsForUser(eventId: string, userId: string): Promise<boolean> {
    return (await Event.exists({ _id: eventId, userId }).exec()) !== null;
  },
};
