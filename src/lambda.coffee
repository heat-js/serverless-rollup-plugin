
import getUnixTime from 'date-fns/getUnixTime'
import chunk from 'lodash/chunk'

export default ->
	getUnixTime new Date
	chunk [1, 2, 3], 2
