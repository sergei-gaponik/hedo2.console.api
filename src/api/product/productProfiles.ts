import { ObjectId } from 'mongodb';
import { context } from '../../core/context'
import { ConsoleRequestError, ConsoleResponse } from '../../types';

async function findProductProfiles(args): Promise<ConsoleResponse>{

  const productProfiles = await context().mongoDB.collection("productprofiles").find().toArray()

  return {
    data: {
      productProfiles
    }
  }

}

async function createProductProfile(args): Promise<ConsoleResponse>{

  await context().mongoDB.collection("productprofiles").insertOne(args.profile)

  return { errors: [] }

}

async function updateProductProfile(args): Promise<ConsoleResponse>{

  await context().mongoDB.collection("productprofiles").updateOne(
    { _id: new ObjectId(args.id) }, 
    { $set: args.update })

  return { errors: [] }
}

async function deleteProductProfiles(args): Promise<ConsoleResponse>{

  const ids = args.ids.map(a => new ObjectId(a))

  await context().mongoDB.collection("productprofiles").deleteMany({ _id: { $in: ids }})
  
  return { errors: [] }
}

export {
  findProductProfiles,
  createProductProfile,
  deleteProductProfiles,
  updateProductProfile
}