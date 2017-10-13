const nest = require('depnest')
const { h, computed, map, when, Dict, dictToCollection, Array: MutantArray, resolve } = require('mutant')
const pull = require('pull-stream')
const next = require('pull-next-step')
const get = require('lodash/get')
const isEmpty = require('lodash/isEmpty')

exports.gives = nest('app.html.context')

exports.needs = nest({
  'about.html.image': 'first',
  'about.obs.name': 'first',
  'feed.pull.private': 'first',
  'feed.pull.rollup': 'first',
  'keys.sync.id': 'first',
  'history.sync.push': 'first',
  'message.html.subject': 'first',
  'sbot.obs.localPeers': 'first',
  'translations.sync.strings': 'first',
})


exports.create = (api) => {
  return nest('app.html.context', (location) => {

    const strings = api.translations.sync.strings()
    const myKey = api.keys.sync.id()

    var nearby = api.sbot.obs.localPeers()
    var recentPeersContacted = Dict()
    // TODO - extract as contact.obs.recentPrivate or something

    pull(
      next(api.feed.pull.private, {reverse: true, limit: 100, live: false}, ['value', 'timestamp']),
      pull.filter(msg => msg.value.content.type === 'post'), // TODO is this the best way to protect against votes?
      pull.filter(msg => msg.value.content.recps),
      pull.drain(msg => {
        msg.value.content.recps
          .map(recp => typeof recp === 'object' ? recp.link : recp)
          .filter(recp => recp != myKey)
          .forEach(recp => {
            if (recentPeersContacted.has(recp)) return

            recentPeersContacted.put(recp, msg)
          })
      })
    )

    return h('Context -feed', [
      LevelOneContext(),
      LevelTwoContext()
    ])

    function LevelOneContext () {

      return h('div.level.-one', [
        // Nearby
        computed(nearby, n => !isEmpty(n) ? h('header', strings.peopleNearby) : null),
        map(nearby, feedId => Option({
          notifications: Math.random() > 0.7 ? Math.floor(Math.random()*9+1) : 0, // TODO 
          imageEl: api.about.html.image(feedId), // TODO make avatar
          label: api.about.obs.name(feedId),
          selected: location.feed === feedId,
          location: computed(recentPeersContacted, recent => {
            const lastMsg = recent[feedId]
            return lastMsg
              ? Object.assign(lastMsg, { feed: feedId })
              : { page: 'threadNew', feed: feedId }
          }),
        })),
        computed(nearby, n => !isEmpty(n) ?  h('hr') : null),

        // Discover
        Option({
          notifications: Math.floor(Math.random()*5+1),
          imageEl: h('i.fa.fa-binoculars'),
          label: strings.blogIndex.title,
          selected: ['blogIndex', 'home'].includes(location.page),
          location: { page: 'blogIndex' },
        }),

        // Recent Messages
        map(dictToCollection(recentPeersContacted), ({ key, value })  => { 
          const feedId = key()
          const lastMsg = value()
          if (nearby.has(feedId)) return

          return Option({
            notifications: Math.random() > 0.7 ? Math.floor(Math.random()*9+1) : 0, // TODO
            imageEl: api.about.html.image(feedId), // TODO make avatar
            label: api.about.obs.name(feedId),
            selected: location.feed === feedId,
            location: Object.assign({}, lastMsg, { feed: feedId }) // TODO make obs?
          })
        })
      ])
    }

    function LevelTwoContext () {
      const { key, value, feed: targetUser, page } = location
      const root = get(value, 'content.root', key)
      if (!targetUser) return

      var threads = MutantArray()

      pull(
        next(api.feed.pull.private, {reverse: true, limit: 100, live: false}, ['value', 'timestamp']),
        pull.filter(msg => msg.value.content.recps),
        pull.filter(msg => msg.value.content.recps
          .map(recp => typeof recp === 'object' ? recp.link : recp)
          .some(recp => recp === targetUser)
        ),
        api.feed.pull.rollup(),
        pull.drain(thread => threads.push(thread))
      )

      return h('div.level.-two', [
        Option({
          selected: page === 'threadNew',
          location: {page: 'threadNew', feed: targetUser},
          label: h('Button', strings.threadNew.action.new),
        }),
        map(threads, thread => { 
          return Option({
            label: api.message.html.subject(thread),
            selected: thread.key === root,
            location: Object.assign(thread, { feed: targetUser }),
          })
        })
      ])
    }

    function Option ({ notifications = 0, imageEl, label, location, selected }) {
      const className = selected ? '-selected' : '' 
      const goToLocation = () => {
        api.history.sync.push(resolve(location))
      }

      if (!imageEl) {
        return h('Option', { className, 'ev-click': goToLocation }, [
          h('div.label', label)
        ])
      }

      return h('Option', { className }, [
        h('div.circle', [
          when(notifications, h('div.alert', notifications)),
          imageEl
        ]),
        h('div.label', { 'ev-click': goToLocation }, label)
      ])
    }
  })
}

