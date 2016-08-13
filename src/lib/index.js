export { getFormattedPhoneNumber, getDisplayPhoneNumber } from './phone-format'
export {
  getLocalTime,
  defaultTimezoneIsBetweenTextingHours,
  validOffsets,
  isBetweenTextingHours
} from './timezones'
export {
  isClient
} from './is-client'
export { log } from './log'
export { formatMoney } from './currency'
import Papa from 'papaparse'
import _ from 'lodash'
import { getFormattedPhoneNumber } from '../lib'
import checksum from 'checksum'
export {
  findParent,
  getInteractionPath,
  getInteractionTree,
  sortInteractionSteps,
  interactionStepForId,
  getTopMostParent,
  getChildren
} from './interaction-step-helpers'

const requiredUploadFields = ['firstName', 'lastName', 'cell']
const topLevelUploadFields = ['firstName', 'lastName', 'cell', 'zip']

const getValidatedData = (data, optOuts) => {
  const optOutCells = optOuts.map((optOut) => optOut.cell)
  let validatedData
  let result
  // For some reason destructuring is not working here
  result = _.partition(data, (row) => !!row.cell)
  validatedData = result[0]
  const missingCellRows = result[1]

  validatedData = _.map(validatedData, (row) => _.extend(row, {
    cell: getFormattedPhoneNumber(row.cell) }))
  result = _.partition(validatedData, (row) => !!row.cell)
  validatedData = result[0]
  const invalidCellRows = result[1]

  const count = validatedData.length
  validatedData = _.uniqBy(validatedData, (row) => row.cell)
  const dupeCount = (count - validatedData.length)

  result = _.partition(validatedData, (row) => optOutCells.indexOf(row.cell) === -1)
  validatedData = result[0]
  const optOutRows = result[1]

  return {
    validatedData,
    validationStats: {
      dupeCount,
      optOutCount: optOutRows.length,
      invalidCellCount: invalidCellRows.length,
      missingCellCount: missingCellRows.length
    }
  }
}

export function checksumCampaignContacts(contacts) {
  return checksum(JSON.stringify(contacts.sort((a, b) => a.cell < b.cell)))
}


export const parseCSV = (file, optOuts, callback) => {
  Papa.parse(file, {
    header: true,
    complete: ({ data, meta, errors }, file) => {
      const fields = meta.fields

      const missingFields = []

      for (const field of requiredUploadFields) {
        if (fields.indexOf(field) === -1) {
          missingFields.push(field)
        }
      }

      if (missingFields.length > 0) {
        const error = `Missing fields: ${missingFields.join(', ')}`
        callback({ error })
      }
      else {
        const { validationStats, validatedData } = getValidatedData(data, optOuts)

        const customFields = fields.filter((field) => topLevelUploadFields.indexOf(field) === -1)

        callback({
          customFields,
          validationStats,
          contacts: validatedData
        })
      }
    }
  })
}

export const convertRowToContact = (row) => {
  const customFields = row
  const contact = {}
  for (const field of topLevelUploadFields) {
    if (_.has(row, field)) {
      contact[field] = row[field]
    }
  }

  contact.customFields = customFields
  return contact
}