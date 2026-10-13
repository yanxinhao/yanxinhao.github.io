/* All input axes/origins are in the shared rest-pose voxel frame. */
(function(root) {
  const V=p=>new THREE.Vector3(p[0],p[2],-p[1]);
  const P=p=>V(p.map(x=>x-31.5));
  function rotation(axis,origin,degrees) {
    const a=V(axis); if(a.length()<1e-8)throw Error('Zero motion axis');
    const p=P(origin), t=new THREE.Matrix4().makeTranslation(p.x,p.y,p.z);
    return t.multiply(new THREE.Matrix4().makeRotationAxis(a.normalize(),degrees*Math.PI/180))
      .multiply(new THREE.Matrix4().makeTranslation(-p.x,-p.y,-p.z));
  }
  function translation(axis,distance) {
    const a=V(axis);if(a.length()<1e-8)throw Error('Zero slide axis');a.normalize().multiplyScalar(distance);
    return new THREE.Matrix4().makeTranslation(a.x,a.y,a.z);
  }
  function local(j,pose) {
    const p=j.params||{}, q=pose||{}; let m=new THREE.Matrix4();
    if(j.type==='revolute'||j.type==='rotate_slide')m=rotation(p.rotate_axis||p.axis,p.rotate_origin||p.origin,q.angle||0);
    if(j.type==='prismatic'||j.type==='rotate_slide')m.premultiply(translation(j.type==='prismatic'?p.axis:p.slide_direction,q.distance||0));
    // Explicitly requested demonstrations; these are not annotated trajectories.
    if(j.type==='hinge'&&q.demoAngle)m=rotation([0,0,1],p.hinge_position_voxel,q.demoAngle);
    if(j.type==='free'&&q.demoDistance)m=translation([1,0,0],q.demoDistance);
    return m;
  }
  function worldMatrices(gt,poses) {
    const joints=new Map(gt.articulation.map(j=>[j.group_id,j])),out=new Map(),active=new Set();
    function visit(id) {
      if(out.has(id))return out.get(id);
      if(active.has(id))throw Error('Cyclic group graph');
      const j=joints.get(id);if(!j)throw Error('Missing parent group '+id);active.add(id);
      const m=local(j,poses.get(id));
      if(j.parent_group!=null)m.premultiply(visit(j.parent_group));
      active.delete(id);out.set(id,m);return m;
    }
    joints.forEach(j=>visit(j.group_id));return out;
  }
  root.TrainMotion={worldMatrices,local,point:P,vector:V};
})(typeof window!=='undefined'?window:globalThis);
