import chai from 'chai'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'
const { expect } = chai
chai.use(sinonChai)

global.callNative = function () {}
global.callAddElement = function () {}

import * as ctrl from '../../../../frameworks/legacy/app/ctrl'
import Differ from '../../../../frameworks/legacy/app/differ'
import { Document } from '../../../../runtime/vdom'
import Listener from '../../../../runtime/listener'

describe('the api of app', () => {
  let app
  let spy1
  let spy2

  function createApp () {
    const id = Date.now()

    const app = {
      id: id,
      customComponentMap: {},
      registerComponent: function () {},
      // define: sinon.spy(),
      // bootstrap: sinon.stub(),
      callbacks: {
        1: spy2
      },
      vm: {},
      differ: new Differ(id)
    }

    app.doc = new Document(id, '', spy1, Listener)
    app.doc.createBody('div')
    // app.bootstrap.returns()

    return app
  }

  before(() => {
    spy1 = sinon.spy()
    spy2 = sinon.spy()
    app = createApp()
    !console.debug && (console.debug = function () {})
  })

  afterEach(() => {
    spy1.reset()
    // spy2.reset()
  })

  describe('init', () => {
    before(() => {
      global.transformerVersion = '0.1.3'
    })

    after(() => {
      global.transformerVersion = undefined
    })

    it('a simple bundle', () => {
      app.requireModule = () => {}
      ctrl.init(app, `
        define('main', function (r, e, m) {
          e.template = {
            "type": "container",
            "children": [{
              "type": "text",
              "attr": {
                "value": "Hello World"
              }
            }]
          }
        })

        bootstrap('main')
      `)

      // expect(app.define.calledOnce).to.be.true
      // expect(app.bootstrap.calledOnce).to.be.true

      const task = spy1.lastCall.args[0][0]
      expect(task.module).to.be.equal('dom')
      expect(task.method).to.be.equal('createFinish')
      expect(task.args.length).to.be.equal(0)
    })
  })

  describe('getRootElement', () => {
    it('from a simple', () => {
      const json = ctrl.getRootElement(app)
      expect(json.ref).eql('_root')
      expect(json.type).eql('div')
      expect(json.children.length).eql(1)
    })
    it('from empty object', () => {
      expect(ctrl.getRootElement({})).to.deep.equal({})
    })
  })

  describe('fireEvent', () => {
    it('click on root', () => {
      ctrl.fireEvent(app, '_root', 'click')
      const task = spy1.lastCall.args[0][0]
      expect(task.module).to.be.equal('dom')
      expect(task.method).to.be.equal('updateFinish')
      expect(task.args.length).to.be.equal(0)
    })

    it('error', () => {
      const result = ctrl.fireEvent(app, '_rootTest', 'click')
      expect(result).to.be.an.instanceof(Error)
    })
  })

  describe('callback', () => {
    it('with a simple data', () => {
      const data = { a: 'b' }
      ctrl.callback(app, '1', data, true)
      expect(spy2.calledOnce).to.be.true
      expect(spy2.args[0][0]).to.deep.equal(data)
      expect(app.callbacks[1]).to.be.a('function')

      const task = spy1.firstCall.args[0][0]
      expect(task.module).to.be.equal('dom')
      expect(task.method).to.be.equal('updateFinish')
      expect(task.args.length).to.be.equal(0)
    })

    it('multiple called', () => {
      const data = { a: 'b' }
      ctrl.callback(app, '1', data, true)
      expect(spy2.calledTwice).to.be.true
      expect(spy2.args[0][0]).to.deep.equal(data)
      expect(app.callbacks[1]).to.be.a('function')

      ctrl.callback(app, '1', data, false)
      expect(spy2.calledThrice).to.be.true
      expect(spy2.args[0][0]).to.deep.equal(data)
      expect(app.callbacks[1]).to.be.undefined
    })

    it('error', () => {
      const data = null
      const result = ctrl.callback(app, '1', data, true)
      expect(result).to.be.an.instanceof(Error)
    })
  })

  describe('updateActions', () => {
    let originalCallNative

    before(() => {
      originalCallNative = global.callNative
      global.callNative = function () {}
    })

    after(() => {
      global.callNative = originalCallNative
    })

    it('update actions in listener', () => {
      app.doc.listener.updates = [
        {
          method () {},
          args: [undefined, null, /\.x/i, new Date(), 2, '3', true, ['']]
        }
      ]
      ctrl.updateActions(app)

      expect(app.doc.listener.updates).to.deep.equal([])
    })
  })

  describe('refreshData', () => {
    it('a simple data', () => {
      const data = { b: 'c' }
      ctrl.refresh(app, data)
      expect(app.vm.b).to.deep.equal(data.b)

      const task = spy1.lastCall.args[0][0]
      expect(task.module).to.be.equal('dom')
      expect(task.method).to.be.equal('refreshFinish')
      expect(task.args.length).to.be.equal(0)
    })

    it('error', () => {
      const data = null
      const result = ctrl.refresh(app, data)
      expect(result).to.be.an.instanceof(Error)
    })
  })

  describe('destory', () => {
    it('the simple data', () => {
      ctrl.destroy(app)
      expect(app.id).to.be.empty
      expect(app.blocks).to.be.null
      expect(app.vm).to.be.null
      expect(app.doc).to.be.null
      expect(app.customComponentMap).to.be.null
      expect(app.callbacks).to.be.null
    })
    it('the incomplete data', () => {
      const appx = createApp()
      delete appx.vm
      ctrl.destroy(appx)
      expect(appx.id).to.be.empty
      expect(appx.blocks).to.be.null
      expect(appx.vm).to.be.null
      expect(appx.doc).to.be.null
      expect(appx.customComponentMap).to.be.null
      expect(appx.callbacks).to.be.null
    })
    it('clear vms', () => {
      const appy = createApp()
      appy.vm = {
        $emit () {},
        _watchers: [{ teardown () {} }],
        _childrenVms: [{ $emit () {} }]
      }
      ctrl.destroy(appy)
      expect(appy.id).to.be.empty
      expect(appy.blocks).to.be.null
      expect(appy.vm).to.be.null
      expect(appy.doc).to.be.null
      expect(appy.customComponentMap).to.be.null
      expect(appy.callbacks).to.be.null
    })
  })
})
