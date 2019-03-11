import React, { PureComponent, Fragment } from 'react'
import debounce from 'debounce'
import classnames from 'classnames'
import PropTypes from 'prop-types'
import EventListener from 'react-event-listener'
import styles from './styles.css'
import {
  resolveSlidesNumber,
  getStylingTransition,
  getTranslateProperty,
  setStyle,
  constants
} from '../utils'

class Slider extends PureComponent {
  static propTypes = {
    /** A render function that will receive as props an orientation prop
     * and a onClick callback */
    arrowRender: PropTypes.func,
    /** The component used to contain both arrows.
     * Either a string to use a DOM element or a component.
     */
    arrowsContainerComponent: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
    /** The slides to render */
    children: PropTypes.oneOfType([
      PropTypes.element,
      PropTypes.arrayOf(PropTypes.element)
    ]),
    /** Classes to apply to the Slider elements */
    classes: PropTypes.shape({
      root: PropTypes.string,
      sliderFrame: PropTypes.string,
    }),
    /** Current slide on the screen (if you have perPage > 1, then the current slide is the most left slide on the screen) */
    currentSlide: PropTypes.number,
    /** Css value of cursor when mouse is hovering the slider frame */
    cursor: PropTypes.string,
    /** Css value of cursos when mouse is down */
    cursorOnMouseDown: PropTypes.string,
    // TODO draggable: PropTypes.bool,
    /** Duration of transitions */
    duration: PropTypes.number,
    /** Transition function */
    easing: PropTypes.string,
    /** Function to change the value of currentSlide */
    onChangeSlide: PropTypes.func.isRequired,
    /** Amount of slides to be on the screen, if a number is passed, then thats the slides that will be shown,
     * if an object with breakpoints is passed, then the component will check the size of the screen to see how
     * many elements will be on the screen
     */
    perPage: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
    /** Resize debounce timer in milliseconds */
    resizeDebounce: PropTypes.number,
    /** Tag to be rendered in the root element of the page */
    rootTag: PropTypes.string,
    /** Tag to be rendered in the slider frame */
    sliderFrameTag: PropTypes.string,
    /** Threshold of pixels to drag to the slider let it go to the next/prev slide */
    threshold: PropTypes.number,
  }

  static defaultProps = {
    classes: {
      root: '',
      sliderFrame: ''
    },
    currentSlide: 0,
    cursor: '-webkit-grab',
    cursorOnMouseDown: '-webkit-grabbing',
    draggable: true,
    duration: 250,
    easing: 'ease-out',
    perPage: 1,
    resizeDebounce: constants.defaultResizeDebounce,
    rootTag: 'div',
    showArrows: false,
    sliderFrameTag: 'ul',
    threshold: 20
  }

  static events = ['onTouchStart', 'onTouchEnd', 'onTouchMove', 'onMouseUp', 'onMouseDown', 'onMouseLeave', 'onMouseMove']

  constructor(props) {
    super(props)

    this.drag = {
      startX: 0,
      endX: 0,
      startY: 0,
      letItGo: null
    }

    this._selector = React.createRef()
    this._sliderFrame = React.createRef()
    this._sliderFrameWidth = 0
    this.handleResize = debounce(this.fit, props.resizeDebounce)

    this.state = {
      firstRender: true
    }
  }

  componentDidMount() {
    this.setState({ firstRender: false })
  }

  componentWillUnmount() {
    this.handleResize.clear()
  }

  componentDidUpdate() {
    const { draggable, currentSlide, easing, duration, cursor } = this.props

    this.setSelectorWidth()
    this.setInnerElements()
    this.perPage = resolveSlidesNumber(this.props.perPage)

    setStyle(this._sliderFrame.current, {
      ...getStylingTransition(easing, duration),
      width: `${this.totalSlides / this.perPage * 100}%`,
      ...(draggable ? { cursor } : {}),
    })
    this._sliderFrameWidth = this._sliderFrame.current.getBoundingClientRect().width

    this.innerElements.forEach(el => {
      setStyle(el, {
        width: `${100 / this.totalSlides}%`,
      })
    })
    const newCurrentSlide = Math.min(Math.max(currentSlide, 0), this.totalSlides - this.perPage)
    this.slideToCurrent(false, newCurrentSlide)
  }

  fit = () => {
    const { perPage, currentSlide, onChangeSlide } = this.props
    this.perPage = resolveSlidesNumber(perPage)
    const newCurrentSlide = Math.floor(currentSlide / this.perPage) * this.perPage

    this.setSelectorWidth()
    setStyle(this._sliderFrame.current, {
      width: `${this.totalSlides / this.perPage * 100}%`
    })
    this._sliderFrameWidth = this._sliderFrame.current.getBoundingClientRect().width

    if (currentSlide !== newCurrentSlide) {
      onChangeSlide(newCurrentSlide)
    }

    this.slideToCurrent(false, newCurrentSlide)
    this.forceUpdate()
  }

  setSelectorWidth = () => {
    this.selectorWidth = this._selector.current.getBoundingClientRect().width
  }

  setInnerElements = () => {
    this.innerElements = Array.prototype.slice.call(this._sliderFrame.current.children)
  }

  get totalSlides() {
    return this.props.children ? React.Children.count(this.props.children) : 0
  }

  prev = (howManySlides = 1) => {
    if (this.totalSlides <= this.perPage) {
      return
    }

    const { onChangeSlide, currentSlide } = this.props

    const newCurrentSlide = Math.max(currentSlide - howManySlides, 0)

    if (newCurrentSlide !== currentSlide) {
      this.slideToCurrent(false, newCurrentSlide)
      onChangeSlide(newCurrentSlide)
    }

    return newCurrentSlide
  }

  next = (howManySlides = 1) => {
    if (this.totalSlides <= this.perPage) {
      return
    }

    const { onChangeSlide, currentSlide } = this.props
    const newCurrentSlide = Math.min(currentSlide + howManySlides, this.totalSlides - this.perPage)

    if (newCurrentSlide !== currentSlide) {
      this.slideToCurrent(false, newCurrentSlide)
      onChangeSlide(newCurrentSlide)
    }

    return newCurrentSlide
  }

  prevPage = () => {
    this.prev(this.perPage)
  }

  nextPage = () => {
    this.next(this.perPage)
  }

  goTo = index => {
    const { onChangeSlide, currentSlide } = this.props

    if (this.totalSlides <= this.perPage) {
      return
    }

    const newCurrentSlide = Math.min(Math.max(index, 0), this.totalSlides - this.perPage)

    if (newCurrentSlide !== currentSlide) {
      this.slideToCurrent(false, newCurrentSlide)
      onChangeSlide(newCurrentSlide)
    }
  }

  slideToCurrent = (shouldEnableTransition, currentSlide) => {
    const offset = -1 * currentSlide * 100 / this.totalSlides
    if (shouldEnableTransition) {
      const { easing, duration } = this.props
      setStyle(this._sliderFrame.current, {
        ...getStylingTransition(easing, duration), // enable transition
        ...getTranslateProperty(offset)
      })
    } else {
      setStyle(this._sliderFrame.current, {
        ...getTranslateProperty(offset)
      })
    }
  }

  updateAfterDrag = () => {
    const { threshold, currentSlide } = this.props
    const movement = this.drag.endX - this.drag.startX
    const movementDistance = Math.abs(movement)
    const howManySliderToSlide = Math.ceil(movementDistance / (this.selectorWidth / this.perPage))

    let newCurrentSlide = currentSlide
    if (movement > 0 && movementDistance > threshold && this.totalSlides > this.perPage) {
      newCurrentSlide = this.prev(howManySliderToSlide)
    } else if (movement < 0 && movementDistance > threshold && this.totalSlides > this.perPage) {
      newCurrentSlide = this.next(howManySliderToSlide)
    }
    this.slideToCurrent(false, newCurrentSlide)
  }

  _clearDrag = () => {
    this.drag = {
      startX: 0,
      endX: 0,
      startY: 0,
      letItGo: null
    }
  }

  onTouchStart = e => {
    this.pointerDown = true
    this.drag.startX = e.touches[0].pageX
    this.drag.startY = e.touches[0].pageY
  }

  onTouchEnd = () => {
    const { easing, duration } = this.props

    this.pointerDown = false
    setStyle(this._sliderFrame.current, { ...getStylingTransition(easing, duration) })
    if (this.drag.endX) {
      this.updateAfterDrag()
    }
    this._clearDrag()
  }

  onTouchMove = e => {
    if (this.drag.letItGo === null) {
      this.drag.letItGo = Math.abs(this.drag.startY - e.touches[0].pageY) < Math.abs(this.drag.startX - e.touches[0].pageX)
    }

    if (this.pointerDown && this.drag.letItGo) {
      const { easing, currentSlide } = this.props

      this.drag.endX = e.touches[0].pageX

      const currentOffset = currentSlide * (this.selectorWidth / this.perPage)
      const dragOffset = this.drag.endX - this.drag.startX
      const offset = (currentOffset - dragOffset) / this._sliderFrameWidth * -100

      setStyle(this._sliderFrame.current, {
        ...getStylingTransition(easing),
        ...getTranslateProperty(offset),
      })
    }
  }

  onMouseDown = e => {
    e.preventDefault()
    this.pointerDown = true
    this.drag.startX = e.pageX

    setStyle(this._sliderFrame.current, {
      cursor: this.props.cursorOnMouseDown
    })
  }

  onMouseUp = e => {
    const { draggable, cursor, easing, duration } = this.props

    this.pointerDown = false
    setStyle(this._sliderFrame.current, {
      ...getStylingTransition(easing, duration),
      ...(draggable ? { cursor } : {})
    })

    if (this.drag.endX) {
      this.updateAfterDrag()
    }

    this._clearDrag()
  }

  onMouseMove = e => {
    const { currentSlide, draggable, cursorOnMouseDown, easing } = this.props

    e.preventDefault()
    if (this.pointerDown && draggable) {
      // TODO prevent link clicks

      this.drag.endX = e.pageX

      const currentOffset = currentSlide * (this.selectorWidth / this.perPage)
      const dragOffset = (this.drag.endX - this.drag.startX)
      const offset = (currentOffset - dragOffset) / this._sliderFrameWidth * -100

      setStyle(this._sliderFrame.current, {
        cursor: cursorOnMouseDown,
        ...getStylingTransition(easing),
        ...getTranslateProperty(offset)
      })
    }
  }

  onMouseLeave = e => {

    if (this.pointerDown) {
      const { cursor, draggable, easing, duration } = this.props
      this.pointerDown = false
      this.drag.endX = e.pageX

      setStyle(this._sliderFrame.current, {
        ...getStylingTransition(easing, duration),
        ...(draggable ? { cursor } : {}),
      })
      this.updateAfterDrag()
      this._clearDrag()
    }
  }

  renderArrows = () => {
    const {
      arrowsContainerComponent: ArrowsContainerComponent,
      arrowRender
    } = this.props

    if (!arrowRender) {
      return null
    }

    const arrows = (
      <Fragment>
        {arrowRender({ orientation: 'left', onClick: this.prevPage })}
        {arrowRender({ orientation: 'right', onClick: this.nextPage })}
      </Fragment>
    )
    return ArrowsContainerComponent ? (
      <ArrowsContainerComponent>
        {arrows}
      </ArrowsContainerComponent>
    ) : arrows
  }

  render() {
    const {
      children,
      sliderFrameTag: SliderFrameTag,
      rootTag: RootTag,
      classes: classesProp
    } = this.props
    const { firstRender } = this.state
    if (!this.perPage) {
      this.perPage = resolveSlidesNumber(this.props.perPage)
    }

    const classes = {
      ...Slider.defaultProps.classes,
      ...classesProp
    }

    return (
      <Fragment>
        {this.renderArrows()}
        <RootTag
          className={classnames(classes.root, 'overflow-hidden h-100')}
          ref={this._selector}
          {...Slider.events.reduce((props, event) => ({ ...props, [event]: this[event] }), {})}
        >
          <EventListener target="window" onResize={this.handleResize} />
          <SliderFrameTag
            className={classnames(classes.sliderFrame, styles.sliderFrame, 'list pa0 h-100 ma0 flex')}
            style={firstRender ? { width: `${100 * this.totalSlides / this.perPage}%` } : {}}
            ref={this._sliderFrame}
          >
            {children}
          </SliderFrameTag>
        </RootTag>
      </Fragment>
    )
  }
}

export default Slider
