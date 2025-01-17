const nest = require('depnest')
const { h, Array: MutantArray, computed, when, map } = require('mutant')

exports.gives = nest('contact.html.follow')

exports.needs = nest({
  'contact.async.follow': 'first',
  'contact.async.unfollow': 'first',
  'contact.obs.followers': 'first',
  'keys.sync.id': 'first',
  'translations.sync.strings': 'first',
})

exports.create = (api) => {
  return nest('contact.html.follow', follow)

  function follow (feed) {
    const strings = api.translations.sync.strings()
    const myId = api.keys.sync.id()

    if (feed === myId) return

    const { followers } = api.contact.obs
    const theirFollowers = followers(feed)
    const youFollowThem = computed(theirFollowers, followers => followers.includes(myId))

    const { unfollow, follow } = api.contact.async
    const className = when(youFollowThem, '-following')
    
    return h('Follow', { className },
      when(theirFollowers.sync,
        when(youFollowThem,
          h('Button', { 'ev-click': () => unfollow(feed) }, strings.userShow.action.unfollow),
          h('Button', { 'ev-click': () => follow(feed) }, strings.userShow.action.follow)
        ),
        h('Button', { disabled: 'disabled' }, strings.loading )
      )
    )
  }
}

